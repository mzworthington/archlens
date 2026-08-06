import { describe, expect, it } from 'vitest';
import type { SystemNode, SystemSchema } from '@archlens/core';
import { planNodeNameUpdate } from './planNodeNameUpdate';

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

const apiNode = schema.nodes[0] as SystemNode;

describe('planNodeNameUpdate', () => {
  it('updates entityRef when the slug is unique', () => {
    expect(planNodeNameUpdate(schema, apiNode, 'api', 'API Gateway')).toEqual({
      name: 'API Gateway',
      entityRef: 'api-gateway',
    });
  });

  it('keeps the name only when the slug collides', () => {
    expect(planNodeNameUpdate(schema, apiNode, 'api', 'DB')).toEqual({
      name: 'DB',
    });
  });

  it('keeps the name only when the slug is unchanged', () => {
    expect(planNodeNameUpdate(schema, apiNode, 'api', 'API')).toEqual({
      name: 'API',
    });
  });
});
