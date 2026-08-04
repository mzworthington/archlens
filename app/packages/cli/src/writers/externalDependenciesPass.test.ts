import { describe, it, expect, beforeEach } from 'vitest';
import { parseSchemaFromYaml, serializeSchemaToYaml, type SystemSchema } from '@archlens/core';
import { MockFileSystem, MockLogger } from '../test/fakes.ts';
import {
  applyExternalDependenciesPass,
  listBlueprintSchemaPaths,
} from './externalDependenciesPass.ts';

const containers: SystemSchema = {
  entityRef: 'application/cli',
  name: 'Cli Containers',
  version: '1.0.0',
  level: 'container',
  nodes: [
    { entityRef: 'application/cli/vhs', type: 'container', name: 'Vhs Service', x: 10, y: 10 },
    {
      entityRef: 'application/cli/writers',
      type: 'container',
      name: 'Writers Service',
      x: 20,
      y: 20,
    },
    {
      entityRef: 'application/cli/analysis',
      type: 'container',
      name: 'Analysis Service',
      x: 30,
      y: 30,
    },
  ],
  dependencies: [
    { from: 'application/cli/vhs', to: 'application/cli/analysis', type: 'inter-container' },
  ],
};

const vhsComponents: SystemSchema = {
  entityRef: 'application/cli/vhs',
  name: 'Vhs Components',
  version: '1.0.0',
  level: 'component',
  nodes: [
    {
      entityRef: 'application/cli/vhs/cli-demo-test',
      type: 'background-worker',
      name: 'cli-demo.test Service',
      x: 40,
      y: 40,
    },
  ],
  dependencies: [],
};

const writersComponents: SystemSchema = {
  entityRef: 'application/cli/writers',
  name: 'Writers Components',
  version: '1.0.0',
  level: 'component',
  nodes: [
    {
      entityRef: 'application/cli/writers/context-level-writer',
      type: 'background-worker',
      name: 'Context Level Writer',
      x: 50,
      y: 50,
    },
  ],
  dependencies: [
    {
      from: 'application/cli/writers/context-level-writer',
      to: 'application/cli/vhs/cli-demo-test',
      type: 'direct-call',
    },
  ],
};

describe('applyExternalDependenciesPass', () => {
  let fileSystem: MockFileSystem;
  let logger: MockLogger;
  const rootDir = '/workspace/blueprints';

  beforeEach(() => {
    fileSystem = new MockFileSystem();
    logger = new MockLogger();

    const cliDir = `${rootDir}/cli`;
    fileSystem.directories.set(rootDir, ['cli']);
    fileSystem.directories.set(cliDir, [
      'containers.yaml',
      'vhs-components.yaml',
      'writers-components.yaml',
    ]);

    const files: Array<[string, SystemSchema]> = [
      [`${cliDir}/containers.yaml`, containers],
      [`${cliDir}/vhs-components.yaml`, vhsComponents],
      [`${cliDir}/writers-components.yaml`, writersComponents],
    ];
    for (const [path, schema] of files) {
      fileSystem.writtenFiles.set(path, serializeSchemaToYaml(schema));
      fileSystem.existingFiles.add(path);
    }
  });

  it('rewrites component schemas with unresolved external proxy nodes only', async () => {
    const result = await applyExternalDependenciesPass(rootDir, fileSystem, logger);

    expect(result.schemasUpdated).toBeGreaterThan(0);

    const vhs = parseSchemaFromYaml(
      await fileSystem.readSchema(`${rootDir}/cli/vhs-components.yaml`)
    );
    // No dangling deps on vhs → no externals (neighbor containers are not auto-added)
    expect(vhs.nodes.filter(n => n.external)).toHaveLength(0);

    const writers = parseSchemaFromYaml(
      await fileSystem.readSchema(`${rootDir}/cli/writers-components.yaml`)
    );
    expect(
      writers.nodes.find(n => n.entityRef === 'application/cli/vhs/cli-demo-test')
    ).toMatchObject({
      external: true,
    });
    // Suggested neighbor containers are not included in CLI unresolved mode
    expect(writers.nodes.some(n => n.entityRef === 'application/cli/analysis' && n.external)).toBe(
      false
    );
  });

  it('rolls component couplings up onto containers.yaml as inter-container edges', async () => {
    await applyExternalDependenciesPass(rootDir, fileSystem, logger);

    const containersSchema = parseSchemaFromYaml(
      await fileSystem.readSchema(`${rootDir}/cli/containers.yaml`)
    );
    const edge = containersSchema.dependencies.find(
      d => d.from === 'application/cli/writers' && d.to === 'application/cli/vhs'
    );
    expect(edge).toMatchObject({ type: 'inter-container' });
    expect(edge?.description).toMatch(/Context Level Writer/);
  });

  it('does not add component noise onto application/context.yaml', async () => {
    const contextPath = `${rootDir}/application/context.yaml`;
    fileSystem.directories.set(rootDir, ['cli', 'application']);
    fileSystem.writtenFiles.set(
      contextPath,
      serializeSchemaToYaml({
        entityRef: 'blueprint',
        name: 'Blueprint',
        version: '1.0.0',
        level: 'context',
        nodes: [{ entityRef: 'application/cli', type: 'software-system', name: 'Cli System' }],
        dependencies: [
          {
            from: 'application/cli',
            to: 'application/cli/vhs/cli-demo-test',
            type: 'direct-call',
          },
        ],
      })
    );
    fileSystem.existingFiles.add(contextPath);

    await applyExternalDependenciesPass(rootDir, fileSystem, logger);

    const context = parseSchemaFromYaml(await fileSystem.readSchema(contextPath));
    expect(context.nodes.filter(n => n.external)).toHaveLength(0);
    expect(context.nodes.map(n => n.entityRef)).not.toContain('application/cli/vhs/cli-demo-test');
  });

  it('is a no-op when the blueprints tree is empty', async () => {
    const emptyFs = new MockFileSystem();
    emptyFs.directories.set(rootDir, []);
    const result = await applyExternalDependenciesPass(rootDir, emptyFs, logger);
    expect(result.schemasUpdated).toBe(0);
    expect(result.schemasScanned).toBe(0);
  });

  it('adds service-level coupling edges and external component proxies on container diagrams', async () => {
    const stressDir = `${rootDir}/chaoslens-stress`;
    fileSystem.directories.set(rootDir, ['chaoslens-stress']);
    fileSystem.directories.set(stressDir, [
      'external-scope-containers.yaml',
      'external-scope-components.yaml',
      'external-auth-components.yaml',
    ]);

    const storefrontContainers: SystemSchema = {
      entityRef: 'chaoslens-stress/external-scope',
      name: 'Storefront Containers',
      version: '1.0.0',
      level: 'container',
      nodes: [
        {
          entityRef: 'chaoslens-stress/external-scope/web',
          type: 'web-app',
          name: 'Web Storefront',
        },
        {
          entityRef: 'chaoslens-stress/external-scope/api',
          type: 'rest-api',
          name: 'API Gateway',
        },
      ],
      dependencies: [],
    };

    const storefrontComponents: SystemSchema = {
      entityRef: 'chaoslens-stress/external-scope',
      name: 'Storefront Components',
      version: '1.0.0',
      level: 'component',
      nodes: [
        {
          entityRef: 'chaoslens-stress/external-scope/api/gateway',
          type: 'rest-api',
          name: 'Gateway Handler',
        },
      ],
      dependencies: [
        {
          from: 'chaoslens-stress/external-scope/api/gateway',
          to: 'chaoslens-stress/external-auth/auth',
          type: 'direct-call',
        },
      ],
    };

    const authComponents: SystemSchema = {
      entityRef: 'chaoslens-stress/external-auth',
      name: 'Auth Components',
      version: '1.0.0',
      level: 'component',
      nodes: [
        {
          entityRef: 'chaoslens-stress/external-auth/auth',
          type: 'microservice',
          name: 'Auth Service',
        },
      ],
      dependencies: [],
    };

    const files: Array<[string, SystemSchema]> = [
      [`${stressDir}/external-scope-containers.yaml`, storefrontContainers],
      [`${stressDir}/external-scope-components.yaml`, storefrontComponents],
      [`${stressDir}/external-auth-components.yaml`, authComponents],
    ];
    for (const [path, schema] of files) {
      fileSystem.writtenFiles.set(path, serializeSchemaToYaml(schema));
      fileSystem.existingFiles.add(path);
    }

    const result = await applyExternalDependenciesPass(rootDir, fileSystem, logger);
    expect(result.schemasUpdated).toBeGreaterThan(0);

    const storefront = parseSchemaFromYaml(
      await fileSystem.readSchema(`${stressDir}/external-scope-containers.yaml`)
    );
    expect(storefront.dependencies).toContainEqual(
      expect.objectContaining({
        from: 'chaoslens-stress/external-scope/api',
        to: 'chaoslens-stress/external-auth/auth',
        type: 'direct-call',
      })
    );
    expect(
      storefront.nodes.find(
        n => n.entityRef === 'chaoslens-stress/external-auth/auth' && n.external
      )
    ).toBeDefined();
  });
});

describe('listBlueprintSchemaPaths', () => {
  it('skips *-overlay.yaml merge helpers', () => {
    const fileSystem = new MockFileSystem();
    fileSystem.directories.set('/workspace/samples', ['demo']);
    fileSystem.directories.set('/workspace/samples/demo', ['context.yaml', 'context-overlay.yaml']);

    expect(listBlueprintSchemaPaths('/workspace/samples', fileSystem)).toEqual([
      '/workspace/samples/demo/context.yaml',
    ]);
  });
});
