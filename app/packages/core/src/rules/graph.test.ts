import { describe, it, expect } from 'vitest';
import {
  validateGraph,
  parseSchemaFromYaml,
  serializeSchemaToYaml,
  serializeSchemaToMermaid,
  toSystemSchemaJsonSchema,
  dedupeDependencies,
} from './graph';
import {
  BLUEPRINT_API_VERSION,
  BLUEPRINT_KIND_DIAGRAM,
  SYSTEM_SCHEMA_MAJOR_VERSION,
} from '../models/schemaVersion';
import { emptySystemSchema, type SystemSchema } from '../models/schema';

describe('dedupeDependencies', () => {
  it('keeps the first edge for each from→to pair', () => {
    const deps = dedupeDependencies([
      { from: 'a', to: 'b', type: 'direct-call', description: 'first' },
      { from: 'a', to: 'b', type: 'direct-call', description: 'dup' },
      { from: 'a', to: 'c', type: 'read-write' },
    ]);
    expect(deps).toEqual([
      { from: 'a', to: 'b', type: 'direct-call', description: 'first' },
      { from: 'a', to: 'c', type: 'read-write' },
    ]);
  });
});

describe('toSystemSchemaJsonSchema', () => {
  it('exports Draft-07 JSON Schema as a v4 Diagram document', () => {
    const schema = toSystemSchemaJsonSchema();
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema');
    expect(schema.$id).toBe(
      `https://blueprint.mzworthington.co.uk/schemas/v${SYSTEM_SCHEMA_MAJOR_VERSION}/blueprint.schema.json`
    );
    expect(schema.title).toBe('Blueprint Diagram');
    expect(schema.examples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          apiVersion: BLUEPRINT_API_VERSION,
          kind: BLUEPRINT_KIND_DIAGRAM,
        }),
      ])
    );
    expect(schema.required).toEqual(
      expect.arrayContaining(['apiVersion', 'kind', 'metadata', 'spec'])
    );
    const props = schema.properties as Record<string, { properties?: Record<string, unknown> }>;
    expect(props.spec).toEqual(expect.objectContaining({ type: 'object' }));
    expect(props.metadata.properties).toEqual(
      expect.objectContaining({
        entityRef: expect.any(Object),
        name: expect.any(Object),
      })
    );
  });

  it('uses channel-specific $id for latest', () => {
    const latest = toSystemSchemaJsonSchema('latest');
    expect(latest.$id).toBe(
      'https://blueprint.mzworthington.co.uk/schemas/latest/blueprint.schema.json'
    );
  });
});

describe('Graph Validation & Cycle Detection', () => {
  it('should validate a clean, acyclic graph', () => {
    const schema: SystemSchema = {
      ...emptySystemSchema({ name: 'Acyclic System', level: 'container' }),
      nodes: [
        { entityRef: 'Gateway', type: 'rest-api', name: 'Gateway' },
        { entityRef: 'AuthService', type: 'grpc-service', name: 'AuthService' },
        { entityRef: 'SessionDB', type: 'relational-database', name: 'SessionDB' },
      ],
      dependencies: [
        { from: 'Gateway', to: 'AuthService', type: 'direct-call' },
        { from: 'AuthService', to: 'SessionDB', type: 'read-write' },
      ],
    };

    const result = validateGraph(schema);
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should detect a direct cycle (A -> A)', () => {
    const schema: SystemSchema = {
      ...emptySystemSchema({ name: 'Self Loop', level: 'container' }),
      nodes: [{ entityRef: 'Worker', type: 'serverless-function', name: 'Worker' }],
      dependencies: [{ from: 'Worker', to: 'Worker', type: 'direct-call' }],
    };

    const result = validateGraph(schema);
    expect(result.isValid).toBe(false);
    expect(result.issues[0].type).toBe('cycle');
  });
});

const SAMPLE_V4_YAML = `apiVersion: ${BLUEPRINT_API_VERSION}
kind: Diagram
metadata:
  entityRef: blueprint/app
  name: App Containers
spec:
  level: container
  nodes:
    - entityRef: blueprint/app/api
      type: microservice
      name: API
  dependencies:
    - from: blueprint/app/web
      to: blueprint/app/api
      type: direct-call
`;

describe('YAML serialization & parsing', () => {
  it('should serialize SystemSchema to v4 wire format', () => {
    const schema = emptySystemSchema({
      name: 'Test System',
      level: 'container',
      entityRef: 'blueprint/app',
      nodes: [{ entityRef: 'blueprint/app/api', type: 'microservice', name: 'API' }],
    });

    const yamlContent = serializeSchemaToYaml(schema);
    expect(yamlContent).toMatch(/^apiVersion: blueprint\.dev\/v4\n/);
    expect(yamlContent).toContain('kind: Diagram');
    expect(yamlContent).toContain('metadata:');
    expect(yamlContent).toContain('spec:');
    expect(yamlContent).not.toContain('metaData:');
  });

  it('should round-trip metadata.source provenance in YAML', () => {
    const schema = emptySystemSchema({
      name: 'Scanned',
      level: 'context',
      entityRef: 'blueprint',
      source: {
        remoteUrl: 'https://github.com/org/repo',
        scannedAtCommit: 'abc123def456',
        defaultBranch: 'main',
        scanRoot: '.',
      },
    });

    const parsed = parseSchemaFromYaml(serializeSchemaToYaml(schema));
    expect(parsed.source).toEqual(schema.source);
  });

  it('should parse v4 YAML into SystemSchema', () => {
    const schema = parseSchemaFromYaml(SAMPLE_V4_YAML);
    expect(schema.apiVersion).toBe(BLUEPRINT_API_VERSION);
    expect(schema.kind).toBe('Diagram');
    expect(schema.entityRef).toBe('blueprint/app');
    expect(schema.level).toBe('container');
    expect(schema.nodes).toHaveLength(1);
    expect(schema.dependencies).toHaveLength(1);
  });

  it('rejects legacy v3 wire format', () => {
    const legacy = `version: https://blueprint.mzworthington.co.uk/schemas/v3/blueprint.schema.json
level: context
metaData:
  name: Legacy
  nodes: []
`;
    expect(() => parseSchemaFromYaml(legacy)).toThrow(/v4|apiVersion|metadata|spec/i);
  });

  it('serializes node metadata labels and annotations when present', () => {
    const schema = emptySystemSchema({
      name: 'Meta',
      level: 'component',
      nodes: [
        {
          entityRef: 'a/b/c',
          type: 'component',
          name: 'C',
          metadata: {
            labels: { team: 'platform' },
            annotations: { docs: 'https://example.com' },
          },
        },
      ],
    });
    const yaml = serializeSchemaToYaml(schema);
    expect(yaml).toContain('labels:');
    expect(yaml).toContain('team: platform');
    expect(yaml).toContain('annotations:');
    const roundTrip = parseSchemaFromYaml(yaml);
    expect(roundTrip.nodes[0].metadata).toEqual(schema.nodes[0].metadata);
  });
});

describe('Mermaid export', () => {
  it('exports nodes and dependencies', () => {
    const schema = emptySystemSchema({
      name: 'M',
      level: 'container',
      nodes: [
        { entityRef: 'a', type: 'web-app', name: 'A' },
        { entityRef: 'b', type: 'microservice', name: 'B' },
      ],
      dependencies: [{ from: 'a', to: 'b', type: 'direct-call', description: 'calls' }],
    });
    const mermaid = serializeSchemaToMermaid(schema);
    expect(mermaid).toContain('graph TD');
    expect(mermaid).toContain('calls');
  });
});
