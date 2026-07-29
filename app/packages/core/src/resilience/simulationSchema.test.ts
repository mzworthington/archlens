import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { runResilienceSimulation } from './simulation';
import {
  buildSimulationSchema,
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
});

describe('materializeUnresolvedSimulationEndpoints', () => {
  it('materializes unresolved dependency endpoints from the workspace', () => {
    const { materialized } = materializeUnresolvedSimulationEndpoints(shopSchema, loadedSystems);

    expect(materialized.map(entity => entity.entityRef)).toEqual(['shop/auth']);
  });
});
