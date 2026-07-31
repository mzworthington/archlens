import { describe, expect, it } from 'vitest';
import { buildExecutiveTelemetrySummary, riskLevelFromSla } from './executiveTelemetry';
import type { SimulationResult } from './simulation';

function baseResult(overrides: Partial<SimulationResult> = {}): SimulationResult {
  return {
    heat: new Map(),
    heatHops: new Map(),
    integrityHeat: new Map(),
    impactedNodes: [],
    integrityImpactedNodes: [],
    entryPointSlas: { 'shop/web': 100 },
    overallSla: 100,
    overallIntegrity: 100,
    spofs: [],
    impactedDomains: [],
    integrityImpactedDomains: [],
    advice: [],
    propagationStoppedAt: [],
    faultNodeIds: [],
    ...overrides,
  };
}

describe('riskLevelFromSla', () => {
  it('maps SLA bands to risk levels', () => {
    expect(riskLevelFromSla(99.5)).toBe('low');
    expect(riskLevelFromSla(97)).toBe('medium');
    expect(riskLevelFromSla(92)).toBe('high');
    expect(riskLevelFromSla(80)).toBe('critical');
  });
});

describe('buildExecutiveTelemetrySummary', () => {
  it('describes unchanged availability when SLA is unaffected', () => {
    const summary = buildExecutiveTelemetrySummary(
      baseResult({
        integrityImpactedNodes: ['shop/worker'],
        overallIntegrity: 75,
        integrityImpactedDomains: ['shop'],
      })
    );

    expect(summary.availabilityHeadline).toContain('unchanged');
    expect(summary.integrityHeadline).toContain('75%');
    expect(summary.riskLevel).toBe('low');
    expect(summary.continuitySummary).toContain('1 business domain');
    expect(summary.journeyImpactDeferred).toBe(true);
  });

  it('summarizes degraded availability without entity refs', () => {
    const summary = buildExecutiveTelemetrySummary(
      baseResult({
        overallSla: 92,
        impactedDomains: ['shop', 'billing'],
        entryPointSlas: { 'shop/web': 92, 'billing/portal': 94 },
      })
    );

    expect(summary.availabilityHeadline).toContain('92%');
    expect(summary.riskLevel).toBe('high');
    expect(summary.riskLabel).toBe('High risk');
    expect(summary.continuitySummary).toContain('2 business domains');
    expect(summary.availabilityHeadline).not.toContain('shop/web');
  });

  it('mentions structural SPOFs in plain language', () => {
    const summary = buildExecutiveTelemetrySummary(
      baseResult({
        spofs: ['shop/payment', 'shop/inventory'],
      })
    );

    expect(summary.spofSummary).toContain('2 structural single points');
  });
});
