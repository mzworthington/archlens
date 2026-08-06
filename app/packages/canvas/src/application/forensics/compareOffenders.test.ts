import { describe, expect, it } from 'vitest';
import { compareOffenders } from './compareOffenders';
import type { RankedOffender } from './rankOffenders';

function offender(
  partial: Partial<RankedOffender> & Pick<RankedOffender, 'entityRef'>
): RankedOffender {
  return {
    name: partial.entityRef,
    type: 'component',
    parentLabel: 'app',
    schemaPath: 'x.yaml',
    schemaLevel: 'component',
    diagramEntityRef: 'app',
    hotspotScore: 0,
    refactorScore: 0,
    classifications: [],
    concern: { level: 'none', reasons: [] },
    dependencyCount: 0,
    ...partial,
  };
}

describe('compareOffenders', () => {
  it('ranks refactor filter by effective score then composite risk', () => {
    const low = offender({
      entityRef: 'low',
      refactorScore: 10,
      effectiveRefactorScore: 10,
      compositeRiskScore: 0.9,
    });
    const high = offender({
      entityRef: 'high',
      refactorScore: 5,
      effectiveRefactorScore: 20,
      compositeRiskScore: 0.1,
    });

    expect(compareOffenders(low, high, 'refactor')).toBeGreaterThan(0);
    expect(compareOffenders(high, low, 'refactor')).toBeLessThan(0);
  });

  it('prefers hotspot classification over score alone in default ranking', () => {
    const classified = offender({
      entityRef: 'hot',
      hotspotScore: 0.2,
      classifications: ['hotspot'],
    });
    const scored = offender({
      entityRef: 'score',
      hotspotScore: 0.9,
      classifications: [],
    });

    expect(compareOffenders(classified, scored, 'all')).toBeLessThan(0);
  });
});
