import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import type { SimulationResult } from '@archlens/core/resilience';
import { buildChaosRiskContextMap } from './chaosRiskContext';

const schema = (nodes: SystemSchema['nodes']): SystemSchema => ({
  name: 'App',
  version: '1.0.0',
  level: 'container',
  nodes,
  dependencies: [],
});

describe('buildChaosRiskContextMap', () => {
  it('returns empty map without simulation', () => {
    expect(buildChaosRiskContextMap([], null).size).toBe(0);
  });

  it('marks high-blast and spof nodes as critical path with safeguard coverage', () => {
    const simulation: SimulationResult = {
      heat: new Map([['app/api', 0.8]]),
      heatHops: new Map(),
      integrityHeat: new Map(),
      impactedNodes: ['app/api'],
      integrityImpactedNodes: [],
      entryPointSlas: {},
      overallSla: 50,
      overallIntegrity: 100,
      spofs: ['app/db'],
      impactedDomains: [],
      integrityImpactedDomains: [],
      advice: [],
      propagationStoppedAt: [],
    };

    const systems = [
      {
        schema: schema([
          {
            entityRef: 'app/api',
            name: 'API',
            type: 'rest-api',
            resilience: { circuitBreaker: true },
          },
          { entityRef: 'app/db', name: 'DB', type: 'relational-database' },
        ]),
      },
    ];

    const map = buildChaosRiskContextMap(systems, simulation);
    expect(map.get('app/api')?.onCriticalPath).toBe(true);
    expect(map.get('app/api')?.safeguardCoverage).toBe(0.25);
    expect(map.get('app/db')?.isSpof).toBe(true);
    expect(map.get('app/db')?.onCriticalPath).toBe(true);
  });
});
