import { describe, expect, it } from 'vitest';
import type { SimulationResult } from '../resilience/simulation';
import { buildChaosRiskContextMap } from './chaosRiskContext';

describe('buildChaosRiskContextMap', () => {
  it('returns empty map when simulation is missing', () => {
    expect(buildChaosRiskContextMap([], null).size).toBe(0);
  });

  it('marks high blast nodes as on critical path', () => {
    const simulation = {
      heat: new Map([['app/api', 0.5]]),
      integrityHeat: new Map(),
      spofs: [],
    } as SimulationResult;

    const map = buildChaosRiskContextMap(
      [
        {
          schema: {
            nodes: [{ entityRef: 'app/api', name: 'API', type: 'component' }],
            dependencies: [],
            name: 'x',
            version: '1',
            level: 'component',
          },
        },
      ],
      simulation
    );

    expect(map.get('app/api')).toMatchObject({
      blastRadius: 0.5,
      onCriticalPath: true,
    });
  });
});
