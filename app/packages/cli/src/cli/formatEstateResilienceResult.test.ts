import { describe, expect, it } from 'vitest';
import type { EstateResilienceReport } from '@archlens/core/recommendations';
import { ADVICELENS_ARTIFACT_KIND } from '@archlens/core/recommendations';
import { formatEstateResilienceResult } from './formatEstateResilienceResult.ts';

function sampleReport(): EstateResilienceReport {
  return {
    diagrams: [
      {
        diagramPath: 'shop-containers.yaml',
        diagramRef: 'shop',
        scenarioCount: 2,
        worstOverallSla: 90,
        spofCount: 1,
        simulation: {
          heat: new Map([['shop/api', 0.8]]),
          heatHops: new Map([['shop/api', 1]]),
          integrityHeat: new Map(),
          impactedNodes: ['shop/api'],
          integrityImpactedNodes: [],
          entryPointSlas: { 'shop/web': 90 },
          overallSla: 90,
          overallIntegrity: 100,
          spofs: ['shop/api'],
          impactedDomains: ['shop'],
          integrityImpactedDomains: [],
          advice: [],
          propagationStoppedAt: [],
          faultNodeIds: ['shop/db'],
          engine: 'typescript',
        },
        recommendations: [],
      },
    ],
    recommendations: [
      {
        id: 'rec-1',
        kind: 'add-circuit-breaker',
        source: 'chaoslens',
        targetEntityRef: 'shop/api',
        targetName: 'API',
        title: 'Add circuit breaker',
        detail: 'Isolate the shared dependency.',
        priority: 80,
        evidence: {},
        actions: [],
      },
    ],
    summary: {
      diagramCount: 1,
      totalScenarios: 2,
      worstOverallSla: 90,
      totalSpofs: 1,
      recommendationCount: 1,
    },
  };
}

describe('formatEstateResilienceResult', () => {
  it('serializes JSON as a versioned AdviceLens artifact with plain heat maps', () => {
    const json = formatEstateResilienceResult(sampleReport(), 'json');
    const parsed = JSON.parse(json) as {
      kind: string;
      diagrams: Array<{ simulation: { heat: Record<string, number> } }>;
    };

    expect(parsed.kind).toBe(ADVICELENS_ARTIFACT_KIND);
    expect(parsed.diagrams[0]!.simulation.heat).toEqual({ 'shop/api': 0.8 });
    expect(json.endsWith('\n')).toBe(true);
  });

  it('serializes YAML as a versioned AdviceLens artifact', () => {
    const yamlText = formatEstateResilienceResult(sampleReport(), 'yaml');
    expect(yamlText).toContain('kind: advicelens-estate-report');
    expect(yamlText).toContain('version: 1');
    expect(yamlText).toContain('shop/api');
  });

  it('keeps a human-readable text summary', () => {
    const text = formatEstateResilienceResult(sampleReport(), 'text');
    expect(text).toContain('AdviceLens estate report');
    expect(text).toContain('Worst SLA: 90%');
    expect(text).toContain('Add circuit breaker');
  });
});
