import { describe, expect, it } from 'vitest';
import {
  computeChaosRefactorMultiplier,
  computeCompositeRiskScore,
  computeEffectiveRefactorScore,
} from './compositeRisk';

describe('computeCompositeRiskScore', () => {
  it('multiplies clamped hotspot and blast scores', () => {
    expect(computeCompositeRiskScore(0.8, 0.5)).toBeCloseTo(0.4);
    expect(computeCompositeRiskScore(1.5, -0.2)).toBe(0);
  });
});

describe('computeChaosRefactorMultiplier', () => {
  it('boosts nodes on critical paths with weak safeguards', () => {
    const boosted = computeChaosRefactorMultiplier({
      blastRadius: 0.7,
      onCriticalPath: true,
      isSpof: true,
      safeguardCoverage: 0,
    });
    const mild = computeChaosRefactorMultiplier({
      blastRadius: 0.1,
      onCriticalPath: false,
      isSpof: false,
      safeguardCoverage: 1,
    });
    expect(boosted).toBeGreaterThan(mild);
    expect(boosted).toBeGreaterThan(1);
  });
});

describe('computeEffectiveRefactorScore', () => {
  it('scales base refactor score by chaos multiplier', () => {
    const base = 100;
    const effective = computeEffectiveRefactorScore(base, {
      blastRadius: 0.6,
      onCriticalPath: true,
      isSpof: false,
      safeguardCoverage: 0.25,
    });
    expect(effective).toBeGreaterThan(base);
  });
});
