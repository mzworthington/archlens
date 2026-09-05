import { describe, it, expect } from 'vitest';
import { parseSchemaFromYaml } from '../rules/graphParse';
import { serializeSchemaToYaml } from '../rules/graphSerialize';
import type { SystemSchema } from './schema';
import { toSystemSchemaJsonSchema } from './systemSchema';

describe('toSystemSchemaJsonSchema', () => {
  it('exports Draft-07 JSON Schema as a v4 object document with metadata', () => {
    const schema = toSystemSchemaJsonSchema();
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.$id).toBe('https://archlens.dev/schemas/v4/blueprint.schema.json');
    expect(schema.title).toBe('Blueprint System Schema');
    expect(schema.type).toBe('object');
    expect(schema.required).toEqual(
      expect.arrayContaining(['version', 'level', 'metadata', 'nodes'])
    );
    const props = schema.properties as Record<
      string,
      { properties?: Record<string, unknown>; enum?: string[] }
    >;
    expect(props.level.enum).toEqual(['context', 'container', 'component', 'code']);
    expect(props.metadata.properties).toEqual(
      expect.objectContaining({
        entityRef: expect.any(Object),
        name: expect.any(Object),
      })
    );
  });
});

describe('YAML Schema Parsing and Serialization', () => {
  it('should parse valid v3 YAML into SystemSchema model', () => {
    const yamlContent = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: container
metadata:
  name: Demo System
nodes:
  - entityRef: UserApi
    type: grpc-service
    name: User API
  - entityRef: UserCache
    type: cache-store
    name: Redis Cache
dependencies:
  - from: UserApi
    to: UserCache
    type: read-write
`;
    const schema = parseSchemaFromYaml(yamlContent);
    expect(schema.name).toBe('Demo System');
    expect(schema.nodes).toHaveLength(2);
    expect(schema.nodes[0].entityRef).toBe('UserApi');
    expect(schema.nodes[1].type).toBe('cache-store');
    expect(schema.dependencies).toHaveLength(1);
    expect(schema.dependencies[0].from).toBe('UserApi');
  });

  it('should throw validation errors for YAML with invalid node types', () => {
    const invalidYaml = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: container
metadata:
  name: Malicious System
nodes:
  - entityRef: HackNode
    type: invalid-type-hacker
    name: Hacker
`;
    expect(() => parseSchemaFromYaml(invalidYaml)).toThrow();
  });

  it('should throw validation errors for YAML with malformed node IDs', () => {
    const invalidYaml = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: container
metadata:
  name: Malicious System
nodes:
  - entityRef: "invalid id with spaces"
    type: rest-api
    name: Rest API
`;
    expect(() => parseSchemaFromYaml(invalidYaml)).toThrow();
  });

  it('should reject dependency endpoints that are not entityRefs', () => {
    const spacesYaml = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: container
metadata:
  name: Bad Dep Endpoints
nodes:
  - entityRef: UserApi
    type: rest-api
    name: User API
dependencies:
  - from: "invalid id with spaces"
    to: UserApi
    type: direct-call
`;
    expect(() => parseSchemaFromYaml(spacesYaml)).toThrow(/entityRef/);

    const pathYaml = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: container
metadata:
  name: Bad Dep Path Endpoints
nodes:
  - entityRef: UserApi
    type: rest-api
    name: User API
dependencies:
  - from: UserApi
    to: ../other.yaml
    type: direct-call
`;
    expect(() => parseSchemaFromYaml(pathYaml)).toThrow(/entityRef/);
  });

  it('should serialize SystemSchema model to a v4 object with metadata', () => {
    const schema: SystemSchema = {
      entityRef: 'demo',
      name: 'Demo System',
      version: '1.0.0',
      level: 'container',
      nodes: [
        {
          entityRef: 'UserApi',
          type: 'grpc-service',
          name: 'User API',
          position: { x: 10, y: 20 },
        },
      ],
      dependencies: [],
    };

    const yamlContent = serializeSchemaToYaml(schema);
    expect(yamlContent).toMatch(
      /^version: https:\/\/archlens\.dev\/schemas\/v4\/blueprint\.schema\.json\n/
    );
    expect(yamlContent).toContain('metadata:');
    expect(yamlContent).toContain('  entityRef: demo');
    expect(yamlContent).toContain('  name: Demo System');
    expect(yamlContent).toContain('level: container');
    expect(yamlContent).toContain('- entityRef: UserApi');
    expect(yamlContent).toContain('type: grpc-service');
    expect(yamlContent).toContain('position:');
    expect(yamlContent).toContain('y: 20');
    expect(yamlContent).not.toContain("'y':");
    expect(yamlContent).not.toMatch(/^- entityRef:/m);
    expect(yamlContent).not.toContain('yaml-language-server');
  });

  it('should round-trip metadata.source provenance in YAML', () => {
    const schema: SystemSchema = {
      entityRef: 'blueprint/app/cli',
      name: 'Cli Service Components',
      version: '1.0.0',
      level: 'component',
      nodes: [],
      dependencies: [],
      source: {
        remoteUrl: 'https://github.com/org/repo',
        defaultBranch: 'main',
        scannedAtCommit: 'abc123',
        scanRoot: 'app',
      },
    };

    const yamlContent = serializeSchemaToYaml(schema);
    expect(yamlContent).toContain('source:');
    expect(yamlContent).toContain('remoteUrl: https://github.com/org/repo');
    expect(yamlContent).toContain('scannedAtCommit: abc123');

    const parsed = parseSchemaFromYaml(yamlContent);
    expect(parsed.source).toEqual(schema.source);
  });

  it('should parse v4 YAML with metadata into SystemSchema', () => {
    const yamlContent = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: component
metadata:
  entityRef: blueprint/app/cli
  name: Cli Service Components
nodes:
  - entityRef: blueprint/app/cli/api
    type: rest-api
    name: API
dependencies: []
`;
    const schema = parseSchemaFromYaml(yamlContent);
    expect(schema.entityRef).toBe('blueprint/app/cli');
    expect(schema.name).toBe('Cli Service Components');
    expect(schema.level).toBe('component');
    expect(schema.version).toBe('https://archlens.dev/schemas/v4/blueprint.schema.json');
    expect(schema.nodes).toHaveLength(1);
    expect(schema.nodes[0].entityRef).toBe('blueprint/app/cli/api');
  });

  it('rejects legacy object-root YAML without metadata', () => {
    const legacy = `
entityRef: demo
name: Demo System
version: 1.0.0
level: container
nodes:
  - entityRef: UserApi
    type: grpc-service
    name: User API
`;
    expect(() => parseSchemaFromYaml(legacy)).toThrow(/metadata/);
  });

  it('rejects legacy sequence-root YAML', () => {
    const modern = `
- entityRef: demo
  name: Demo System
  version: 1.0.0
  level: container
  nodes:
    - entityRef: UserApi
      type: grpc-service
      name: User API
`;
    expect(() => parseSchemaFromYaml(modern)).toThrow(/metadata/);
  });

  it('should parse and serialize isTest flag', () => {
    const yamlContent = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: container
metadata:
  name: Test System
nodes:
  - entityRef: ServiceTest
    type: grpc-service
    name: Service Test Component
    isTest: true
`;
    const schema = parseSchemaFromYaml(yamlContent);
    expect(schema.nodes[0].isTest).toBe(true);

    const serialized = serializeSchemaToYaml(schema);
    expect(serialized).toContain('isTest: true');
  });

  it('should accept container node type from CLI-generated schemas', () => {
    const yamlContent = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: container
metadata:
  name: Generated System
nodes:
  - entityRef: core
    type: container
    name: Core Service
`;
    const schema = parseSchemaFromYaml(yamlContent);
    expect(schema.nodes[0].type).toBe('container');
  });

  describe('C4 Model Validation & Serialization Extensions', () => {
    it('should parse C4 properties from valid v3 YAML schema', () => {
      const yamlContent = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  entityRef: billing
  name: High-Level System Context
nodes:
  - entityRef: billing/billing-service
    type: microservice
    name: Billing Service
  - entityRef: billing/payment-gateway
    type: software-system
    name: External Payment Processor
    external: true
dependencies:
  - from: billing/billing-service
    to: billing/payment-gateway
    type: direct-call
    description: Authorize Credit Card
`;
      const schema = parseSchemaFromYaml(yamlContent);
      expect(schema.level).toBe('context');
      expect(schema.entityRef).toBe('billing');
      expect(schema.nodes).toHaveLength(2);
      expect(schema.nodes[0].entityRef).toBe('billing/billing-service');
      expect(schema.nodes[0].type).toBe('microservice');
      expect(schema.nodes[1].external).toBe(true);
      expect(schema.dependencies[0].description).toBe('Authorize Credit Card');
    });

    it('ignores unknown fields at document root', () => {
      const yamlContent = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: container
metadata:
  name: Legacy Alias
nodes: []
id: billing/web-app
`;
      const schema = parseSchemaFromYaml(yamlContent);
      expect(schema.entityRef).toBe('');
    });

    it('should reject path-style schema identity', () => {
      const invalidYaml = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  name: Bad Path Id
  entityRef: ../root-workspace.yaml
nodes: []
`;
      expect(() => parseSchemaFromYaml(invalidYaml)).toThrow(/entityRef/);
    });

    it('should serialize C4 properties to valid YAML', () => {
      const schema: SystemSchema = {
        name: 'Workspace Level',
        version: '1.2.0',
        level: 'container',
        entityRef: 'billing/web-portal',
        nodes: [
          {
            entityRef: 'billing/web-portal/webapp',
            type: 'web-app',
            name: 'Web Portal',
          },
          {
            entityRef: 'billing/web-portal/external_svc',
            type: 'software-system',
            name: 'API Service',
            external: true,
          },
        ],
        dependencies: [
          {
            from: 'billing/web-portal/webapp',
            to: 'billing/web-portal/external_svc',
            type: 'direct-call',
            description: 'Hits Endpoint',
          },
        ],
      };

      const yamlContent = serializeSchemaToYaml(schema);
      expect(yamlContent).toContain('level: container');
      expect(yamlContent).toContain('entityRef: billing/web-portal');
      expect(yamlContent).toContain('external: true');
    });

    it('should parse and round-trip node forensics', () => {
      const yamlContent = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: component
metadata:
  entityRef: application/cli/forensics
  name: Forensic Component Graph
nodes:
  - entityRef: application/cli/forensics/analyzer
    type: component
    name: Analyzer
    properties:
      filepath: src/analyzer.ts
    forensics:
      complexity: 20
      loc: 100
      sloc: 80
      churn: 12
      churnByWeek:
        - 2
        - 4
        - 3
        - 3
      authorCount: 2
      topAuthorPercent: 0.75
      hotspotScore: 0.9
      sinceDays: 90
      classifications:
        - hotspot
      coupledFiles:
        - path: src/other.ts
          score: 0.8
          sharedCommits: 6
      fileCount: 1
      hotspotCount: 1
      knowledgeSiloCount: 0
`;
      const schema = parseSchemaFromYaml(yamlContent);
      expect(schema.nodes[0].forensics).toMatchObject({
        complexity: 20,
        churn: 12,
        churnByWeek: [2, 4, 3, 3],
        hotspotScore: 0.9,
        sinceDays: 90,
        classifications: ['hotspot'],
        coupledFiles: [{ path: 'src/other.ts', score: 0.8, sharedCommits: 6 }],
      });

      const roundTrip = parseSchemaFromYaml(serializeSchemaToYaml(schema));
      expect(roundTrip.nodes[0].forensics).toEqual(schema.nodes[0].forensics);
    });

    it('should reject invalid forensics classifications', () => {
      const invalidYaml = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: component
metadata:
  name: Bad Forensics
nodes:
  - entityRef: a/b/c
    type: component
    name: Bad
    forensics:
      classifications:
        - not-a-class
`;
      expect(() => parseSchemaFromYaml(invalidYaml)).toThrow();
    });
  });

  describe('flat parentEntityRef wire format', () => {
    it('parses and serializes group children with parentEntityRef', () => {
      const yamlContent = `
version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  entityRef: demo
  name: Demo Context
nodes:
  - entityRef: demo/user
    type: person
    name: User
  - entityRef: demo/hub
    type: group
    name: Product Hub
  - entityRef: demo/api
    type: software-system
    name: API
    parentEntityRef: demo/hub
dependencies:
  - from: demo/user
    to: demo/hub
    type: direct-call
`;
      const schema = parseSchemaFromYaml(yamlContent);
      expect(schema.nodes.find(n => n.entityRef === 'demo/api')?.parentEntityRef).toBe('demo/hub');

      const serialized = serializeSchemaToYaml(schema);
      expect(serialized).toContain('parentEntityRef: demo/hub');
      expect(serialized).not.toContain('children:');

      const roundTrip = parseSchemaFromYaml(serialized);
      expect(roundTrip.nodes.find(n => n.entityRef === 'demo/api')?.parentEntityRef).toBe(
        'demo/hub'
      );
    });
  });
});
