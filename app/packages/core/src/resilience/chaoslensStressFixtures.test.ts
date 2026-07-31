import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseSchemaFromYaml } from '../rules/graph';
import type { ChaosSpec } from './faultSpec';
import { detectSpofs, runResilienceSimulation } from './simulation';
import {
  buildSimulationSchema,
  materializeUnresolvedSimulationEndpoints,
} from './simulationSchema';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const STRESS_DIR = path.join(REPO_ROOT, 'blueprints/chaoslens-stress');
/** Canonical un-enriched external-scope pair (immune to `archlens enrich` on blueprints/). */
const EXTERNAL_SCOPE_STRESS_DIR = path.join(
  REPO_ROOT,
  'scripts/sandbox-blueprints/chaoslens-stress'
);

function loadStressFixture(fileName: string, dir = STRESS_DIR) {
  const yaml = fs.readFileSync(path.join(dir, fileName), 'utf8');
  return parseSchemaFromYaml(yaml);
}

/** KR3 budget for deterministic TypeScript simulation on stress fixtures. */
const MAX_SIM_MS = 5_000;

function runUnderLatencyBudget(schema: ReturnType<typeof loadStressFixture>, spec: ChaosSpec) {
  const start = performance.now();
  const result = runResilienceSimulation(schema, spec);
  const elapsedMs = performance.now() - start;
  expect(elapsedMs).toBeLessThan(MAX_SIM_MS);
  return result;
}

const SCENARIOS = [
  {
    name: 'e-commerce dual entry + preset API circuit breaker',
    file: 'ecommerce-containers.yaml',
    spec: {
      faults: [
        {
          nodeId: 'chaoslens-stress/ecommerce/payment',
          faultType: 'region-outage' as const,
        },
      ],
    },
    spofs: [] as string[],
    overallSla: 100,
    entryPointSlas: {
      'chaoslens-stress/ecommerce/web': 100,
      'chaoslens-stress/ecommerce/mobile': 100,
    },
    propagationStoppedAt: ['chaoslens-stress/ecommerce/api'],
  },
  {
    name: 'shared hub fan-out with preset hub safeguards',
    file: 'shared-hub-containers.yaml',
    spec: {
      faults: [
        {
          nodeId: 'chaoslens-stress/shared-hub/inventory',
          faultType: 'region-outage' as const,
        },
      ],
    },
    spofs: [] as string[],
    overallSla: 100,
    entryPointCount: 5,
    propagationStoppedAt: ['chaoslens-stress/shared-hub/shared-api'],
  },
  {
    name: 'safeguards bulkhead contains leaf fault',
    file: 'safeguards-containers.yaml',
    spec: {
      faults: [
        {
          nodeId: 'chaoslens-stress/safeguards/ledger-db',
          faultType: 'region-outage' as const,
        },
      ],
    },
    spofs: [] as string[],
    overallSla: 100,
    propagationStoppedAt: ['chaoslens-stress/safeguards/bff'],
    unaffectedEntry: 'chaoslens-stress/safeguards/web',
  },
  {
    name: 'group boundary expansion propagates to user',
    file: 'group-boundary-containers.yaml',
    spec: {
      faults: [
        {
          nodeId: 'chaoslens-stress/group-boundary/platform/db',
          faultType: 'region-outage' as const,
        },
      ],
    },
    spofs: ['chaoslens-stress/group-boundary/platform/db'],
    overallSla: 25,
    heatedNodes: [
      'chaoslens-stress/group-boundary/user',
      'chaoslens-stress/group-boundary/platform/api',
    ],
  },
  {
    name: 'deep chain bulkhead contains leaf fault',
    file: 'deep-chain-containers.yaml',
    spec: {
      faults: [
        {
          nodeId: 'chaoslens-stress/deep-chain/leaf',
          faultType: 'region-outage' as const,
        },
      ],
    },
    spofs: [] as string[],
    overallSla: 100,
    propagationStoppedAt: ['chaoslens-stress/deep-chain/hop-05'],
    unaffectedEntry: 'chaoslens-stress/deep-chain/entry',
  },
  {
    name: 'diamond DAG merges parallel paths',
    file: 'diamond-containers.yaml',
    spec: {
      faults: [
        {
          nodeId: 'chaoslens-stress/diamond/cache',
          faultType: 'region-outage' as const,
        },
      ],
    },
    spofs: ['chaoslens-stress/diamond/aggregator'],
    overallSla: 78.9,
  },
  {
    name: 'multi-domain cross-cutting payment',
    file: 'multi-domain-containers.yaml',
    spec: {
      faults: [{ nodeId: 'shared/payment-db', faultType: 'region-outage' as const }],
    },
    spofs: ['shared/payment'],
    overallSla: 53.1,
    impactedDomains: ['shop', 'billing', 'auth', 'shared'],
  },
  {
    name: 'large graph partial blast radius with BFF circuit breaker',
    file: 'large-graph-containers.yaml',
    spec: {
      faults: [
        {
          nodeId: 'chaoslens-stress/large-graph/domain-orders',
          faultType: 'region-outage' as const,
        },
      ],
    },
    overallSla: 91.7,
    minSpofCount: 8,
    propagationStoppedAt: ['chaoslens-stress/large-graph/bff-retail'],
    unaffectedEntry: 'chaoslens-stress/large-graph/edge-mobile-02',
  },
] as const;

describe('chaoslens-stress fixtures', () => {
  it('loads every scenario YAML from blueprints/chaoslens-stress/', () => {
    const files = fs
      .readdirSync(STRESS_DIR)
      .filter(name => name.endsWith('.yaml'))
      .sort();

    expect(files.length).toBeGreaterThanOrEqual(10);
    for (const file of files) {
      expect(() => loadStressFixture(file)).not.toThrow();
    }
  });

  it.each(SCENARIOS)('$name', scenario => {
    const schema = loadStressFixture(scenario.file);

    if ('spofs' in scenario) {
      expect(detectSpofs(schema)).toEqual(scenario.spofs);
    }

    const result = runUnderLatencyBudget(schema, scenario.spec);

    expect(result.overallSla).toBe(scenario.overallSla);

    if ('entryPointSlas' in scenario) {
      expect(result.entryPointSlas).toEqual(scenario.entryPointSlas);
    }

    if ('entryPointCount' in scenario) {
      expect(Object.keys(result.entryPointSlas)).toHaveLength(scenario.entryPointCount);
    }

    if ('propagationStoppedAt' in scenario) {
      expect(result.propagationStoppedAt).toEqual(
        expect.arrayContaining(scenario.propagationStoppedAt)
      );
    }

    if ('unaffectedEntry' in scenario) {
      expect(result.entryPointSlas[scenario.unaffectedEntry]).toBe(100);
    }

    if ('heatedNodes' in scenario) {
      for (const nodeId of scenario.heatedNodes) {
        expect(result.heat.get(nodeId) ?? 0).toBeGreaterThan(0);
      }
    }

    if ('entryHeat' in scenario) {
      for (const [nodeId, minHeat] of Object.entries(scenario.entryHeat)) {
        expect(result.heat.get(nodeId) ?? 0).toBeGreaterThanOrEqual(minHeat);
      }
    }

    if ('impactedDomains' in scenario) {
      expect(result.impactedDomains.sort()).toEqual(scenario.impactedDomains.sort());
    }

    if ('minSpofCount' in scenario) {
      expect(result.spofs.length).toBeGreaterThanOrEqual(scenario.minSpofCount);
    }
  });

  it('runs all scenarios within the KR3 latency budget', () => {
    const start = performance.now();
    for (const scenario of SCENARIOS) {
      runResilienceSimulation(loadStressFixture(scenario.file), scenario.spec);
    }
    expect(performance.now() - start).toBeLessThan(MAX_SIM_MS);
  });
});

const EXTERNAL_SCOPE_ACTIVE = 'external-scope-containers.yaml';
const EXTERNAL_AUTH_SIBLING = 'external-auth-containers.yaml';
const EXTERNAL_SCOPE_WEB = 'chaoslens-stress/external-scope/web';
const EXTERNAL_SCOPE_API = 'chaoslens-stress/external-scope/api';
const EXTERNAL_AUTH = 'chaoslens-stress/external-auth/auth';
const EXTERNAL_AUTH_DB = 'chaoslens-stress/external-auth/session-db';

describe('chaoslens-stress external simulation scope', () => {
  const loadExternalScopeFixture = (fileName: string) =>
    loadStressFixture(fileName, EXTERNAL_SCOPE_STRESS_DIR);

  const loadedSystems = [
    {
      path: EXTERNAL_SCOPE_ACTIVE,
      name: 'External Scope',
      schema: loadExternalScopeFixture(EXTERNAL_SCOPE_ACTIVE),
    },
    {
      path: EXTERNAL_AUTH_SIBLING,
      name: 'External Auth',
      schema: loadExternalScopeFixture(EXTERNAL_AUTH_SIBLING),
    },
  ];

  it('loads the external-scope sandbox pair from blueprints/chaoslens-stress/', () => {
    const active = loadExternalScopeFixture(EXTERNAL_SCOPE_ACTIVE);
    const sibling = loadExternalScopeFixture(EXTERNAL_AUTH_SIBLING);

    expect(active.nodes.map(n => n.entityRef)).toEqual([EXTERNAL_SCOPE_WEB, EXTERNAL_SCOPE_API]);
    expect(active.dependencies?.some(dep => dep.to === EXTERNAL_AUTH)).toBe(true);
    expect(sibling.nodes.some(n => n.entityRef === EXTERNAL_AUTH)).toBe(true);
  });

  it('materializes unresolved dependency endpoints from the workspace', () => {
    const activeSchema = loadExternalScopeFixture(EXTERNAL_SCOPE_ACTIVE);
    const { materialized } = materializeUnresolvedSimulationEndpoints(activeSchema, loadedSystems);

    expect(materialized.map(entity => entity.entityRef)).toEqual([EXTERNAL_AUTH]);
  });

  it('materializes workspace auth and propagates blast when faulting the external dependency', () => {
    const activeSchema = loadExternalScopeFixture(EXTERNAL_SCOPE_ACTIVE);
    const { schema: simSchema, materialized } = buildSimulationSchema(
      activeSchema,
      EXTERNAL_AUTH,
      loadedSystems
    );

    expect(materialized.map(entity => entity.entityRef).sort()).toEqual(
      [EXTERNAL_AUTH, EXTERNAL_AUTH_DB].sort()
    );
    expect(simSchema.nodes.some(node => node.entityRef === EXTERNAL_AUTH && node.external)).toBe(
      true
    );

    const bare = runResilienceSimulation(activeSchema, {
      faults: [{ nodeId: EXTERNAL_AUTH, faultType: 'region-outage' }],
      entryPoints: [EXTERNAL_SCOPE_WEB],
    });
    expect(bare.entryPointSlas[EXTERNAL_SCOPE_WEB]).toBe(100);

    const enriched = runUnderLatencyBudget(simSchema, {
      faults: [{ nodeId: EXTERNAL_AUTH, faultType: 'region-outage' }],
      entryPoints: [EXTERNAL_SCOPE_WEB],
    });

    expect(enriched.heat.get(EXTERNAL_SCOPE_API)).toBeGreaterThan(0);
    expect(enriched.entryPointSlas[EXTERNAL_SCOPE_WEB]).toBe(43.8);
    expect(enriched.overallSla).toBe(43.8);
  });

  it('materializes auth when simulating the API that depends on it', () => {
    const activeSchema = loadExternalScopeFixture(EXTERNAL_SCOPE_ACTIVE);
    const { materialized, scope } = buildSimulationSchema(
      activeSchema,
      EXTERNAL_SCOPE_API,
      loadedSystems
    );

    expect(materialized.map(entity => entity.entityRef).sort()).toEqual(
      [EXTERNAL_AUTH, EXTERNAL_AUTH_DB].sort()
    );
    expect(scope).toEqual(
      expect.arrayContaining([EXTERNAL_SCOPE_API, EXTERNAL_SCOPE_WEB, EXTERNAL_AUTH])
    );

    const result = runUnderLatencyBudget(
      buildSimulationSchema(activeSchema, EXTERNAL_SCOPE_API, loadedSystems).schema,
      {
        faults: [{ nodeId: EXTERNAL_SCOPE_API, faultType: 'region-outage' }],
        entryPoints: [EXTERNAL_SCOPE_WEB],
      }
    );

    expect(result.entryPointSlas[EXTERNAL_SCOPE_WEB]).toBe(25);
  });

  it('expands through the auth proxy into its home diagram and faults session-db', () => {
    const activeSchema = loadExternalScopeFixture(EXTERNAL_SCOPE_ACTIVE);
    const {
      schema: simSchema,
      materialized,
      scope,
    } = buildSimulationSchema(activeSchema, EXTERNAL_AUTH_DB, loadedSystems);

    expect(materialized.map(entity => entity.entityRef).sort()).toEqual(
      [EXTERNAL_AUTH, EXTERNAL_AUTH_DB].sort()
    );
    expect(simSchema.dependencies).toContainEqual(
      expect.objectContaining({
        from: EXTERNAL_AUTH,
        to: EXTERNAL_AUTH_DB,
        type: 'read-write',
      })
    );
    expect(scope).toEqual(
      expect.arrayContaining([
        EXTERNAL_SCOPE_WEB,
        EXTERNAL_SCOPE_API,
        EXTERNAL_AUTH,
        EXTERNAL_AUTH_DB,
      ])
    );

    const result = runUnderLatencyBudget(simSchema, {
      faults: [{ nodeId: EXTERNAL_AUTH_DB, faultType: 'region-outage' }],
      entryPoints: [EXTERNAL_SCOPE_WEB],
    });

    expect(result.heat.get(EXTERNAL_AUTH)).toBeGreaterThan(0);
    expect(result.heat.get(EXTERNAL_SCOPE_API)).toBeGreaterThan(0);
    expect(result.entryPointSlas[EXTERNAL_SCOPE_WEB]).toBeLessThan(100);
  });
});
