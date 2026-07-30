import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { runResilienceSimulation } from './simulation';
import {
  buildSimulationSchema,
  collectSimulationScopeRefs,
  materializeUnresolvedSimulationEndpoints,
} from './simulationSchema';

const shopSchema: SystemSchema = {
  name: 'Shop',
  version: '1.0.0',
  level: 'container',
  entityRef: 'shop',
  nodes: [
    { entityRef: 'shop/web', name: 'Web', type: 'web-app' },
    { entityRef: 'shop/api', name: 'API', type: 'microservice' },
  ],
  dependencies: [
    { from: 'shop/web', to: 'shop/api', type: 'direct-call' },
    { from: 'shop/api', to: 'shop/auth', type: 'direct-call' },
  ],
};

const authSchema: SystemSchema = {
  name: 'Auth',
  version: '1.0.0',
  level: 'container',
  entityRef: 'shop/auth',
  nodes: [{ entityRef: 'shop/auth', name: 'Auth Service', type: 'microservice' }],
  dependencies: [],
};

const loadedSystems = [
  { path: 'shop.yaml', name: 'Shop', schema: shopSchema },
  { path: 'auth.yaml', name: 'Auth', schema: authSchema },
];

describe('buildSimulationSchema', () => {
  it('returns the active schema unchanged when no workspace is loaded', () => {
    const result = buildSimulationSchema(shopSchema, 'shop/api');

    expect(result.schema).toBe(shopSchema);
    expect(result.materialized).toEqual([]);
    expect(result.scope).toEqual(expect.arrayContaining(['shop/api', 'shop/web', 'shop/auth']));
  });

  it('materializes direct external neighbors missing from the active diagram', () => {
    const result = buildSimulationSchema(shopSchema, 'shop/api', loadedSystems);

    expect(result.materialized.map(e => e.entityRef)).toEqual(['shop/auth']);
    expect(result.schema.nodes.some(n => n.entityRef === 'shop/auth' && n.external)).toBe(true);
    expect(result.scope).toContain('shop/auth');
  });

  it('is idempotent when external neighbors are already on the diagram', () => {
    const withAuth: SystemSchema = {
      ...shopSchema,
      nodes: [
        ...shopSchema.nodes,
        { entityRef: 'shop/auth', name: 'Auth (External)', type: 'microservice', external: true },
      ],
    };

    const result = buildSimulationSchema(withAuth, 'shop/api', loadedSystems);

    expect(result.materialized).toEqual([]);
    expect(result.schema.nodes.filter(n => n.entityRef === 'shop/auth')).toHaveLength(1);
  });

  it('enables blast-radius propagation through a materialized external fault target', () => {
    const { schema: simSchema } = buildSimulationSchema(shopSchema, 'shop/auth', loadedSystems);

    const result = runResilienceSimulation(simSchema, {
      faults: [{ nodeId: 'shop/auth', faultType: 'region-outage' }],
      entryPoints: ['shop/web'],
    });

    expect(result.heat.get('shop/api')).toBeGreaterThan(0);
    expect(result.entryPointSlas['shop/web']).toBeLessThan(100);
  });

  it('includes upstream transitive callers in the simulation scope', () => {
    const deepChain: SystemSchema = {
      name: 'Deep Chain',
      version: '1.0.0',
      level: 'container',
      entityRef: 'chain',
      nodes: [
        { entityRef: 'chain/entry', name: 'Entry', type: 'web-app' },
        { entityRef: 'chain/hop-01', name: 'Hop 01', type: 'microservice' },
        { entityRef: 'chain/hop-02', name: 'Hop 02', type: 'microservice' },
        { entityRef: 'chain/leaf', name: 'Leaf', type: 'database' },
      ],
      dependencies: [
        { from: 'chain/entry', to: 'chain/hop-01', type: 'direct-call' },
        { from: 'chain/hop-01', to: 'chain/hop-02', type: 'direct-call' },
        { from: 'chain/hop-02', to: 'chain/leaf', type: 'read-write' },
      ],
    };

    const scope = collectSimulationScopeRefs(deepChain, ['chain/leaf']);

    expect(scope).toEqual(new Set(['chain/leaf', 'chain/hop-02', 'chain/hop-01', 'chain/entry']));
  });
});

describe('materializeUnresolvedSimulationEndpoints', () => {
  it('materializes unresolved dependency endpoints from the workspace', () => {
    const { materialized } = materializeUnresolvedSimulationEndpoints(shopSchema, loadedSystems);

    expect(materialized.map(entity => entity.entityRef)).toEqual(['shop/auth']);
  });
});
