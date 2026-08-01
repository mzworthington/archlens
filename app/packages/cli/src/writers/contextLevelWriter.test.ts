import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContextLevelWriter,
  contextDisplayName,
  personDependenciesForSystems,
  PERSON_EDGE_DESCRIPTION,
  topLevelSystemNodes,
} from './contextLevelWriter.ts';
import { MockFileSystem, MockLogger } from '../test/fakes.ts';
import { parseSchemaFromYaml, serializeSchemaToYaml } from '@archlens/core';

describe('topLevelSystemNodes', () => {
  it('returns nodes without a visual parent, excluding the person', () => {
    const nodes = topLevelSystemNodes([
      {
        entityRef: 'ctx/backstage',
        type: 'group',
        name: 'Backstage',
        properties: { productId: 'backstage' },
      },
      {
        entityRef: 'ctx/packages',
        type: 'software-system',
        name: 'Packages',
        parentEntityRef: 'ctx/backstage',
      },
      { entityRef: 'ctx/user', type: 'person', name: 'User' },
    ]);
    expect(nodes.map(n => n.entityRef)).toEqual(['ctx/backstage']);
  });
});

describe('personDependenciesForSystems', () => {
  it('links the person to top-level groups only', () => {
    const deps = personDependenciesForSystems('ctx/user', [
      {
        entityRef: 'ctx/backstage',
        type: 'group',
        name: 'Backstage',
        properties: { productId: 'backstage' },
      },
      {
        entityRef: 'ctx/packages',
        type: 'software-system',
        name: 'Packages',
        parentEntityRef: 'ctx/backstage',
      },
      {
        entityRef: 'ctx/blueprint',
        type: 'software-system',
        name: 'Blueprint',
        properties: { productId: 'blueprint' },
      },
    ]);

    expect(deps).toHaveLength(2);
    expect(deps.every(d => d.from === 'ctx/user')).toBe(true);
    expect(deps.every(d => d.description === PERSON_EDGE_DESCRIPTION)).toBe(true);
    expect(deps.map(d => d.to).sort()).toEqual(['ctx/backstage', 'ctx/blueprint']);
  });
});

describe('contextDisplayName', () => {
  it('title-cases slugified context roots', () => {
    expect(contextDisplayName('blueprint')).toBe('Blueprint');
    expect(contextDisplayName('My Context Name')).toBe('My Context Name');
  });
});

describe('ContextLevelWriter', () => {
  let fileSystem: MockFileSystem;
  let logger: MockLogger;
  let writer: ContextLevelWriter;

  beforeEach(() => {
    fileSystem = new MockFileSystem();
    logger = new MockLogger();
    writer = new ContextLevelWriter(fileSystem, logger);
  });

  it('should write context schema with correct entityRef', async () => {
    await writer.write('/workspace/blueprints', 'my-context', 'my-system');

    const yamlContent = fileSystem.writtenFiles.get(
      '/workspace/blueprints/my-context/context.yaml'
    )!;
    expect(yamlContent).toContain('entityRef: my-context');
    expect(yamlContent).toContain('name: My Context');
    expect(yamlContent).toContain('entityRef: my-context/my-system');
    expect(yamlContent).toContain('type: software-system');
    expect(yamlContent).toContain('entityRef: my-context/user');
    expect(yamlContent).toContain('type: person');
    expect(yamlContent).toContain(PERSON_EDGE_DESCRIPTION);
    expect(yamlContent).toContain('from: my-context/user');
    expect(yamlContent).toContain('to: my-context/my-system');
  });

  it('should use an explicit display name when provided', async () => {
    await writer.write('/workspace/blueprints', 'backstage', 'packages', 'Packages');

    const yamlContent = fileSystem.writtenFiles.get(
      '/workspace/blueprints/backstage/context.yaml'
    )!;
    expect(yamlContent).toContain('name: Packages System');
    expect(yamlContent).toContain('entityRef: backstage/packages');
  });

  it('should slugify context name in entityRef', async () => {
    await writer.write('/workspace/blueprints', 'My Context Name', 'my-system');

    const yamlContent = fileSystem.writtenFiles.get(
      '/workspace/blueprints/my-context-name/context.yaml'
    )!;
    expect(yamlContent).toContain('entityRef: my-context-name');
    expect(yamlContent).toContain('name: My Context Name');
  });

  it('writes the context diagram under the --context slug', async () => {
    await writer.writeSystems('/workspace/blueprints', 'backstage', [
      {
        entityRef: 'backstage',
        displayName: 'Backstage',
        rootPath: '',
        productId: 'backstage',
        isProductHub: true,
      },
      {
        entityRef: 'packages',
        displayName: 'Packages',
        rootPath: 'packages',
        productId: 'backstage',
      },
    ]);

    const schema = parseSchemaFromYaml(
      fileSystem.writtenFiles.get('/workspace/blueprints/backstage/context.yaml')!
    );
    expect(schema.entityRef).toBe('backstage');
    expect(schema.name).toBe('Backstage');
  });

  it('uses curated display names for peer contexts like E-Shop', async () => {
    await writer.writeSystems('/workspace/blueprints', 'eshop', [
      {
        entityRef: 'eshop',
        displayName: 'EShop',
        rootPath: '',
        productId: 'eshop',
        isProductHub: true,
      },
    ]);

    const schema = parseSchemaFromYaml(
      fileSystem.writtenFiles.get('/workspace/blueprints/eshop/context.yaml')!
    );
    expect(schema.name).toBe('E-Shop');
  });

  it('should merge a second software-system into an existing context diagram', async () => {
    await writer.write('/workspace/blueprints', 'blueprint', 'blueprint');
    await writer.write('/workspace/blueprints', 'backstage', 'backstage');

    const blueprintYaml = fileSystem.writtenFiles.get(
      '/workspace/blueprints/blueprint/context.yaml'
    )!;
    expect(blueprintYaml).toContain('entityRef: blueprint');

    const backstageYaml = fileSystem.writtenFiles.get(
      '/workspace/blueprints/backstage/context.yaml'
    )!;
    expect(backstageYaml).toContain('entityRef: backstage');
  });

  it('emits a group frame when systems nest under a shared folder parent', async () => {
    await writer.writeSystems('/workspace/blueprints', 'infrastructure', [
      {
        entityRef: 'aws',
        displayName: 'Aws',
        rootPath: 'aws',
        productId: 'terraform-examples',
      },
      {
        entityRef: 'aws-lambda-api',
        displayName: 'aws-lambda-api',
        rootPath: 'aws/aws_lambda_api',
        productId: 'terraform-examples',
        parentEntityRef: 'aws',
      },
      {
        entityRef: 'aws-domain-redirect',
        displayName: 'aws-domain-redirect',
        rootPath: 'aws/aws_domain_redirect',
        productId: 'terraform-examples',
        parentEntityRef: 'aws',
      },
    ]);

    const schema = parseSchemaFromYaml(
      fileSystem.writtenFiles.get('/workspace/blueprints/infrastructure/context.yaml')!
    );
    expect(schema.nodes.find(n => n.entityRef === 'infrastructure/aws')?.type).toBe('group');
    expect(
      schema.nodes.find(n => n.entityRef === 'infrastructure/aws-lambda-api')?.parentEntityRef
    ).toBe('infrastructure/aws');
  });

  it('folds IaC folder groups into an existing product hub', async () => {
    await writer.write(
      '/workspace/blueprints',
      'infrastructure',
      'terraform-examples',
      'Terraform Examples'
    );

    await writer.writeSystems('/workspace/blueprints', 'infrastructure', [
      {
        entityRef: 'aws',
        displayName: 'Aws',
        rootPath: 'aws',
        productId: 'terraform-examples',
      },
      {
        entityRef: 'aws-lambda-api',
        displayName: 'aws-lambda-api',
        rootPath: 'aws/aws_lambda_api',
        productId: 'terraform-examples',
        parentEntityRef: 'aws',
      },
      {
        entityRef: 'aws-domain-redirect',
        displayName: 'aws-domain-redirect',
        rootPath: 'aws/aws_domain_redirect',
        productId: 'terraform-examples',
        parentEntityRef: 'aws',
      },
    ]);

    const schema = parseSchemaFromYaml(
      fileSystem.writtenFiles.get('/workspace/blueprints/infrastructure/context.yaml')!
    );
    expect(schema.nodes.find(n => n.entityRef === 'infrastructure/aws')).toBeUndefined();
    expect(schema.nodes.find(n => n.entityRef === 'infrastructure/terraform-examples')?.type).toBe(
      'group'
    );
    expect(
      schema.nodes.find(n => n.entityRef === 'infrastructure/aws-lambda-api')?.parentEntityRef
    ).toBe('infrastructure/terraform-examples');
    expect(
      schema.nodes.find(n => n.entityRef === 'infrastructure/aws-domain-redirect')?.parentEntityRef
    ).toBe('infrastructure/terraform-examples');

    const personEdges = schema.dependencies.filter(d => d.from === 'infrastructure/user');
    expect(personEdges.map(d => d.to)).toEqual(['infrastructure/terraform-examples']);
  });

  it('nests subsystems under the product group and leaves other products disconnected', async () => {
    await writer.writeSystems('/workspace/blueprints', 'blueprint', [
      {
        entityRef: 'blueprint',
        displayName: 'Blueprint',
        rootPath: '',
        productId: 'blueprint',
        isProductHub: true,
      },
    ]);

    await writer.writeSystems('/workspace/blueprints', 'backstage', [
      {
        entityRef: 'backstage',
        displayName: 'Backstage',
        rootPath: '',
        productId: 'backstage',
        isProductHub: true,
      },
      {
        entityRef: 'packages',
        displayName: 'Packages',
        rootPath: 'packages',
        productId: 'backstage',
      },
      {
        entityRef: 'plugins',
        displayName: 'Plugins',
        rootPath: 'plugins',
        productId: 'backstage',
      },
      {
        entityRef: 'microsite',
        displayName: 'Microsite',
        rootPath: 'microsite',
        productId: 'backstage',
      },
    ]);

    const blueprintYaml = fileSystem.writtenFiles.get(
      '/workspace/blueprints/blueprint/context.yaml'
    )!;
    expect(blueprintYaml).toContain('entityRef: blueprint');

    const backstageYaml = fileSystem.writtenFiles.get(
      '/workspace/blueprints/backstage/context.yaml'
    )!;
    expect(backstageYaml).toContain('type: group');
    expect(backstageYaml).toContain('entityRef: backstage');
    expect(backstageYaml).toContain('parentEntityRef: backstage');
    expect(backstageYaml).toContain('entityRef: backstage/packages');
    expect(backstageYaml).not.toContain('Part of product system');

    const blueprintSchema = parseSchemaFromYaml(blueprintYaml);
    const backstageSchema = parseSchemaFromYaml(backstageYaml);
    expect(blueprintSchema.nodes.find(n => n.entityRef === 'blueprint/user')?.type).toBe('person');
    expect(backstageSchema.nodes.find(n => n.entityRef === 'backstage/user')?.type).toBe('person');

    const blueprintPersonEdges = blueprintSchema.dependencies.filter(
      d => d.from === 'blueprint/user'
    );
    const backstagePersonEdges = backstageSchema.dependencies.filter(
      d => d.from === 'backstage/user'
    );
    expect(blueprintPersonEdges.map(d => d.to)).toEqual(['blueprint']);
    expect(backstagePersonEdges.map(d => d.to).sort()).toEqual(['backstage']);
    expect(blueprintPersonEdges.every(d => d.description === PERSON_EDGE_DESCRIPTION)).toBe(true);
    expect(backstagePersonEdges.every(d => d.description === PERSON_EDGE_DESCRIPTION)).toBe(true);
    expect(backstagePersonEdges.some(d => d.to === 'backstage/packages')).toBe(false);

    const packages = backstageSchema.nodes.find(n => n.entityRef === 'backstage/packages');
    expect(packages?.parentEntityRef).toBe('backstage');
  });

  it('should upsert rather than duplicate when rewriting the same system', async () => {
    await writer.write('/workspace/blueprints', 'backstage', 'backstage');
    await writer.write('/workspace/blueprints', 'backstage', 'backstage');

    const yamlContent = fileSystem.writtenFiles.get(
      '/workspace/blueprints/backstage/context.yaml'
    )!;
    const schema = parseSchemaFromYaml(yamlContent);
    const backstageHubs = schema.nodes.filter(n => n.entityRef === 'backstage');
    expect(backstageHubs).toHaveLength(1);
  });

  it('should log successful write', async () => {
    await writer.write('/workspace/blueprints', 'test-context', 'test-system');
    expect(logger.logs.some(log => log.includes('Saved Context schema'))).toBe(true);
  });

  it('migrates legacy root context.yaml into the peer context diagram', async () => {
    const legacyPath = '/workspace/blueprints/context.yaml';
    const targetPath = '/workspace/blueprints/ctx/context.yaml';
    fileSystem.existingFiles.add(legacyPath);
    fileSystem.writtenFiles.set(
      legacyPath,
      serializeSchemaToYaml({
        entityRef: 'ctx',
        name: 'Legacy',
        version: '1.0.0',
        level: 'context',
        nodes: [{ entityRef: 'ctx/app', type: 'software-system', name: 'App' }],
        dependencies: [],
      })
    );

    await writer.writeSystems('/workspace/blueprints', 'ctx', [
      {
        entityRef: 'new-system',
        displayName: 'new-system',
        rootPath: 'new-system',
        productId: 'new-system',
      },
    ]);

    expect(fileSystem.deletedFiles.has(legacyPath)).toBe(true);
    expect(fileSystem.writtenFiles.has(targetPath)).toBe(true);
    const schema = parseSchemaFromYaml(fileSystem.writtenFiles.get(targetPath)!);
    expect(schema.nodes.some(n => n.entityRef === 'ctx/app')).toBe(true);
    expect(schema.nodes.some(n => n.entityRef === 'ctx/new-system')).toBe(true);
  });
});
