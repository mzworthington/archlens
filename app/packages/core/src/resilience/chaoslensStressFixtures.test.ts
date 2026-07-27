import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseSchemaFromYaml } from '../rules/graph';
import type { ChaosSpec } from './faultSpec';
import { detectSpofs, runResilienceSimulation } from './simulation';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const STRESS_DIR = path.join(REPO_ROOT, 'blueprints/chaoslens-stress');

/** KR3 budget for deterministic TypeScript simulation on stress fixtures. */
const MAX_SIM_MS = 5_000;

function loadStressFixture(fileName: string) {
  const yaml = fs.readFileSync(path.join(STRESS_DIR, fileName), 'utf8');
  return parseSchemaFromYaml(yaml);
}

function runUnderLatencyBudget(schema: ReturnType<typeof loadStressFixture>, spec: ChaosSpec) {
  const start = performance.now();
  const result = runResilienceSimulation(schema, spec);
  const elapsedMs = performance.now() - start;
  expect(elapsedMs).toBeLessThan(MAX_SIM_MS);
  return result;
}

const SCENARIOS = [
  {
    name: 'e-commerce dual entry + shared API SPOF',
    file: 'ecommerce-containers.yaml',
    spec: {
      faults: [
        {
          nodeId: 'blueprint/chaoslens-stress/ecommerce/payment',
          faultType: 'region-outage' as const,
        },
      ],
    },
    spofs: ['blueprint/chaoslens-stress/ecommerce/api'],
    overallSla: 43.8,
    entryPointSlas: {
      'blueprint/chaoslens-stress/ecommerce/web': 43.8,
      'blueprint/chaoslens-stress/ecommerce/mobile': 43.8,
    },
  },
  {
    name: 'shared hub fan-out to five frontends',
    file: 'shared-hub-containers.yaml',
    spec: {
      faults: [
        {
          nodeId: 'blueprint/chaoslens-stress/shared-hub/inventory',
          faultType: 'region-outage' as const,
        },
      ],
    },
    spofs: ['blueprint/chaoslens-stress/shared-hub/shared-api'],
    overallSla: 43.8,
    entryPointCount: 5,
  },
  {
    name: 'safeguards bulkhead contains leaf fault',
    file: 'safeguards-containers.yaml',
    spec: {
      faults: [
        {
          nodeId: 'blueprint/chaoslens-stress/safeguards/ledger-db',
          faultType: 'region-outage' as const,
        },
      ],
    },
    spofs: [] as string[],
    overallSla: 100,
    propagationStoppedAt: ['blueprint/chaoslens-stress/safeguards/bff'],
    unaffectedEntry: 'blueprint/chaoslens-stress/safeguards/web',
  },
  {
    name: 'group boundary expansion propagates to user',
    file: 'group-boundary-containers.yaml',
    spec: {
      faults: [
        {
          nodeId: 'blueprint/chaoslens-stress/group-boundary/platform/db',
          faultType: 'region-outage' as const,
        },
      ],
    },
    spofs: ['blueprint/chaoslens-stress/group-boundary/platform/db'],
    overallSla: 25,
    heatedNodes: [
      'blueprint/chaoslens-stress/group-boundary/user',
      'blueprint/chaoslens-stress/group-boundary/platform/api',
    ],
  },
  {
    name: 'deep chain decay at ten hops',
    file: 'deep-chain-containers.yaml',
    spec: {
      faults: [
        {
          nodeId: 'blueprint/chaoslens-stress/deep-chain/leaf',
          faultType: 'region-outage' as const,
        },
      ],
    },
    spofs: [] as string[],
    overallSla: 94.4,
    entryHeat: { 'blueprint/chaoslens-stress/deep-chain/entry': 0.0563 },
  },
  {
    name: 'diamond DAG merges parallel paths',
    file: 'diamond-containers.yaml',
    spec: {
      faults: [
        {
          nodeId: 'blueprint/chaoslens-stress/diamond/cache',
          faultType: 'region-outage' as const,
        },
      ],
    },
    spofs: ['blueprint/chaoslens-stress/diamond/aggregator'],
    overallSla: 57.8,
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
    name: 'large graph partial blast radius',
    file: 'large-graph-containers.yaml',
    spec: {
      faults: [
        {
          nodeId: 'blueprint/chaoslens-stress/large-graph/domain-orders',
          faultType: 'region-outage' as const,
        },
      ],
    },
    overallSla: 72.9,
    minSpofCount: 10,
    unaffectedEntry: 'blueprint/chaoslens-stress/large-graph/edge-mobile-02',
  },
] as const;

describe('chaoslens-stress fixtures', () => {
  it('loads every scenario YAML from blueprints/chaoslens-stress/', () => {
    const files = fs
      .readdirSync(STRESS_DIR)
      .filter(name => name.endsWith('.yaml'))
      .sort();

    expect(files.length).toBeGreaterThanOrEqual(8);
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
