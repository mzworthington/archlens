import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { runResilienceSimulation } from './simulation';
import { buildSimulationSchema } from './simulationSchema';
import { expandSimulationSchemaThroughProxies } from './simulationProxyExpansion';

const storefrontSchema: SystemSchema = {
  name: 'Storefront',
  version: '1.0.0',
  level: 'container',
  entityRef: 'shop/storefront',
  nodes: [
    { entityRef: 'shop/storefront/web', name: 'Web', type: 'web-app' },
    { entityRef: 'shop/storefront/api', name: 'API', type: 'microservice' },
    {
      entityRef: 'shop/auth/service',
      name: 'Auth (External)',
      type: 'microservice',
      external: true,
    },
  ],
  dependencies: [
    { from: 'shop/storefront/web', to: 'shop/storefront/api', type: 'direct-call' },
    { from: 'shop/storefront/api', to: 'shop/auth/service', type: 'direct-call' },
  ],
};

const authHomeSchema: SystemSchema = {
  name: 'Auth',
  version: '1.0.0',
  level: 'container',
  entityRef: 'shop/auth',
  nodes: [
    { entityRef: 'shop/auth/service', name: 'Auth Service', type: 'microservice' },
    { entityRef: 'shop/auth/session-db', name: 'Session DB', type: 'database' },
  ],
  dependencies: [{ from: 'shop/auth/service', to: 'shop/auth/session-db', type: 'read-write' }],
};

const loadedSystems = [
  { path: 'storefront.yaml', name: 'Storefront', schema: storefrontSchema },
  { path: 'auth.yaml', name: 'Auth', schema: authHomeSchema },
];

describe('expandSimulationSchemaThroughProxies', () => {
  it('merges home-diagram dependencies reachable through external proxies in scope', () => {
    const { schema, expandedRefs } = expandSimulationSchemaThroughProxies(
      storefrontSchema,
      new Set(['shop/storefront/api', 'shop/auth/service']),
      loadedSystems
    );

    expect(schema.dependencies).toContainEqual({
      from: 'shop/auth/service',
      to: 'shop/auth/session-db',
      type: 'read-write',
    });
    expect(expandedRefs).toEqual(
      expect.arrayContaining(['shop/auth/service', 'shop/auth/session-db'])
    );
  });

  it('is idempotent when home dependencies are already on the active diagram', () => {
    const withHomeDeps: SystemSchema = {
      ...storefrontSchema,
      dependencies: [
        ...(storefrontSchema.dependencies ?? []),
        { from: 'shop/auth/service', to: 'shop/auth/session-db', type: 'read-write' },
      ],
    };

    const { schema, expandedRefs } = expandSimulationSchemaThroughProxies(
      withHomeDeps,
      new Set(['shop/auth/service']),
      loadedSystems
    );

    expect(schema.dependencies).toHaveLength(withHomeDeps.dependencies?.length);
    expect(expandedRefs).toEqual([]);
  });
});

describe('buildSimulationSchema cross-boundary expansion', () => {
  it('materializes home-diagram neighbors and propagates faults across proxy boundaries', () => {
    const activeSchema: SystemSchema = {
      name: 'Storefront',
      version: '1.0.0',
      level: 'container',
      entityRef: 'shop/storefront',
      nodes: [
        { entityRef: 'shop/storefront/web', name: 'Web', type: 'web-app' },
        { entityRef: 'shop/storefront/api', name: 'API', type: 'microservice' },
      ],
      dependencies: [
        { from: 'shop/storefront/web', to: 'shop/storefront/api', type: 'direct-call' },
        { from: 'shop/storefront/api', to: 'shop/auth/service', type: 'direct-call' },
      ],
    };

    const {
      schema: simSchema,
      materialized,
      scope,
    } = buildSimulationSchema(activeSchema, 'shop/auth/session-db', loadedSystems);

    expect(materialized.map(entity => entity.entityRef).sort()).toEqual(
      ['shop/auth/service', 'shop/auth/session-db'].sort()
    );
    expect(simSchema.dependencies).toContainEqual({
      from: 'shop/auth/service',
      to: 'shop/auth/session-db',
      type: 'read-write',
    });
    expect(scope).toEqual(
      expect.arrayContaining([
        'shop/storefront/web',
        'shop/storefront/api',
        'shop/auth/service',
        'shop/auth/session-db',
      ])
    );

    const result = runResilienceSimulation(simSchema, {
      faults: [{ nodeId: 'shop/auth/session-db', faultType: 'region-outage' }],
      entryPoints: ['shop/storefront/web'],
    });

    expect(result.heat.get('shop/auth/service')).toBeGreaterThan(0);
    expect(result.heat.get('shop/storefront/api')).toBeGreaterThan(0);
    expect(result.entryPointSlas['shop/storefront/web']).toBeLessThan(100);
  });
});
