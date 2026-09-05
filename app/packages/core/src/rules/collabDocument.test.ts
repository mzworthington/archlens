import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { systemSchemaPublicUrl } from '../models/schemaVersion';
import {
  collabDependencyKey,
  collabDocumentToSchema,
  diffCollabDocuments,
  emptyCollabDocument,
  parseCollabDependencyKey,
  schemaToCollabDocument,
} from './collabDocument';

const sampleSchema = (): SystemSchema => ({
  name: 'Shop',
  version: '1.0.0',
  level: 'container',
  entityRef: 'shop',
  source: { remoteUrl: 'https://example.test/shop.git', defaultBranch: 'main' },
  nodes: [
    {
      entityRef: 'shop/api',
      type: 'rest-api',
      name: 'API',
      position: { x: 10, y: 20 },
      properties: { language: 'ts' },
    },
    {
      entityRef: 'shop/db',
      type: 'relational-database',
      name: 'DB',
      external: true,
    },
  ],
  dependencies: [{ from: 'shop/api', to: 'shop/db', type: 'read-write', description: 'queries' }],
});

describe('collabDependencyKey', () => {
  it('keys a dependency by from, to and type', () => {
    expect(collabDependencyKey('shop/api', 'shop/db', 'read-write')).toBe(
      'shop/api|shop/db|read-write'
    );
  });

  it('round-trips the dependency key', () => {
    const key = collabDependencyKey('a', 'b', 'direct-call');
    expect(parseCollabDependencyKey(key)).toEqual({
      from: 'a',
      to: 'b',
      type: 'direct-call',
    });
  });
});

describe('emptyCollabDocument', () => {
  it('starts on the current schema contract, not legacy semver', () => {
    expect(emptyCollabDocument().meta.version).toBe(systemSchemaPublicUrl());
  });
});

describe('schemaToCollabDocument / collabDocumentToSchema', () => {
  it('round-trips SystemSchema including position as one object and source', () => {
    const schema = sampleSchema();
    const doc = schemaToCollabDocument(schema);

    expect(doc.meta).toEqual({
      name: 'Shop',
      version: '1.0.0',
      level: 'container',
      entityRef: 'shop',
      source: { remoteUrl: 'https://example.test/shop.git', defaultBranch: 'main' },
    });
    expect(Object.keys(doc.nodes).sort()).toEqual(['shop/api', 'shop/db']);
    expect(doc.nodes['shop/api'].position).toEqual({ x: 10, y: 20 });
    expect(doc.nodes['shop/api'].properties).toEqual({ language: 'ts' });
    expect(doc.dependencies['shop/api|shop/db|read-write']).toEqual({
      from: 'shop/api',
      to: 'shop/db',
      type: 'read-write',
      description: 'queries',
    });

    expect(collabDocumentToSchema(doc)).toEqual(schema);
  });

  it('omits undefined optional node fields instead of storing them as keys', () => {
    const doc = schemaToCollabDocument({
      name: 'Emptyish',
      version: '1.0.0',
      level: 'context',
      nodes: [{ entityRef: 'ctx', type: 'person', name: 'User' }],
      dependencies: [],
    });

    expect(doc.meta.entityRef).toBeUndefined();
    expect(doc.meta.source).toBeUndefined();
    expect(doc.nodes.ctx).toEqual({
      entityRef: 'ctx',
      type: 'person',
      name: 'User',
    });
    expect('position' in doc.nodes.ctx).toBe(false);
  });

  it('keeps last-write-wins position as a single {x,y} record, not split axes', () => {
    const schema = sampleSchema();
    const doc = schemaToCollabDocument(schema);
    const next = {
      ...doc,
      nodes: {
        ...doc.nodes,
        'shop/api': {
          ...doc.nodes['shop/api'],
          position: { x: 99, y: 88 },
        },
      },
    };

    const restored = collabDocumentToSchema(next);
    expect(restored.nodes.find(n => n.entityRef === 'shop/api')?.position).toEqual({
      x: 99,
      y: 88,
    });
  });
});

describe('diffCollabDocuments', () => {
  it('adds and removes nodes relative to the previous local document only', () => {
    const prev = schemaToCollabDocument({
      name: 'Shop',
      version: '1.0.0',
      level: 'container',
      nodes: [{ entityRef: 'shop/api', type: 'rest-api', name: 'API' }],
      dependencies: [],
    });
    const next = schemaToCollabDocument({
      name: 'Shop',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'shop/api', type: 'rest-api', name: 'API v2' },
        { entityRef: 'shop/web', type: 'web-app', name: 'Web' },
      ],
      dependencies: [{ from: 'shop/web', to: 'shop/api', type: 'direct-call' }],
    });

    const patch = diffCollabDocuments(prev, next);
    expect(patch.meta).toBeUndefined();
    expect(patch.nodesAdd['shop/web']?.name).toBe('Web');
    expect(patch.nodeFields['shop/api']).toEqual({ name: 'API v2' });
    expect(patch.nodesDelete).toEqual([]);
    expect(patch.depsAdd['shop/web|shop/api|direct-call']?.from).toBe('shop/web');
    expect(patch.depsDelete).toEqual([]);
  });

  it('deletes only keys that disappeared from the previous local document', () => {
    const prev = schemaToCollabDocument({
      name: 'Shop',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'shop/api', type: 'rest-api', name: 'API' },
        { entityRef: 'shop/old', type: 'rest-api', name: 'Old' },
      ],
      dependencies: [{ from: 'shop/old', to: 'shop/api', type: 'direct-call' }],
    });
    const next = schemaToCollabDocument({
      name: 'Shop',
      version: '1.0.0',
      level: 'container',
      nodes: [{ entityRef: 'shop/api', type: 'rest-api', name: 'API' }],
      dependencies: [],
    });

    const patch = diffCollabDocuments(prev, next);
    expect(patch.nodesDelete).toEqual(['shop/old']);
    expect(patch.depsDelete).toEqual(['shop/old|shop/api|direct-call']);
    expect(patch.nodesAdd).toEqual({});
    expect(patch.nodeFields).toEqual({});
  });
});
