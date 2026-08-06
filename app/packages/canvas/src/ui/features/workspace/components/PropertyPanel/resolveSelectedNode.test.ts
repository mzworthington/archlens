import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import type {
  BlueprintRFEdge,
  BlueprintRFNode,
} from '../../../../../application/store/layoutUtils';
import {
  findSelectedEdge,
  isEdgeEndpointMissing,
  resolveSelectedSchemaNode,
  resolveSelectedRfNode,
} from './resolveSelectedNode';

const schema: SystemSchema = {
  name: 'Shop',
  version: '1.0.0',
  level: 'container',
  nodes: [
    { entityRef: 'shop/api', name: 'API', type: 'rest-api' },
    { entityRef: 'shop/db', name: 'DB', type: 'database' },
  ],
  dependencies: [],
};

const nodes = [
  { id: 'api', data: { entityRef: 'shop/api' } },
  { id: 'db', data: { entityRef: 'shop/db' } },
] as unknown as BlueprintRFNode[];

describe('resolveSelectedRfNode', () => {
  it('matches by react-flow id or entityRef', () => {
    expect(resolveSelectedRfNode(nodes, 'api')?.id).toBe('api');
    expect(resolveSelectedRfNode(nodes, 'shop/db')?.id).toBe('db');
    expect(resolveSelectedRfNode(nodes, null)).toBeUndefined();
  });
});

describe('resolveSelectedSchemaNode', () => {
  it('resolves schema node from RF selection', () => {
    const rf = resolveSelectedRfNode(nodes, 'api');
    expect(resolveSelectedSchemaNode(schema, rf)?.entityRef).toBe('shop/api');
  });

  it('returns null when nothing is selected', () => {
    expect(resolveSelectedSchemaNode(schema, undefined)).toBeNull();
  });
});

describe('findSelectedEdge / isEdgeEndpointMissing', () => {
  const edges = [
    { id: 'e1', source: 'api', target: 'db' },
    { id: 'e2', source: 'api', target: 'missing' },
  ] as unknown as BlueprintRFEdge[];

  it('finds selected edge by id', () => {
    expect(findSelectedEdge(edges, 'e1')?.id).toBe('e1');
    expect(findSelectedEdge(edges, null)).toBeNull();
  });

  it('detects dangling edge endpoints', () => {
    expect(isEdgeEndpointMissing(nodes, findSelectedEdge(edges, 'e1'))).toBe(false);
    expect(isEdgeEndpointMissing(nodes, findSelectedEdge(edges, 'e2'))).toBe(true);
    expect(isEdgeEndpointMissing(nodes, null)).toBe(false);
  });
});
