import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { runResilienceSimulation } from '../resilience/simulation';
import { buildRecommendations } from './buildRecommendations';
import { buildResilienceRecommendations } from './resilienceRecommendations';

const ecommerceSchema: SystemSchema = {
  name: 'E-Commerce',
  version: '1.0.0',
  level: 'container',
  nodes: [
    { entityRef: 'shop/web', name: 'Web App', type: 'web-app' },
    { entityRef: 'shop/mobile', name: 'Mobile App', type: 'mobile-app' },
    { entityRef: 'shop/api', name: 'API', type: 'microservice' },
    { entityRef: 'shop/payment', name: 'Payment', type: 'microservice' },
    { entityRef: 'shop/db', name: 'Database', type: 'database' },
  ],
  dependencies: [
    { from: 'shop/web', to: 'shop/api', type: 'direct-call' },
    { from: 'shop/mobile', to: 'shop/api', type: 'direct-call' },
    { from: 'shop/api', to: 'shop/payment', type: 'direct-call' },
    { from: 'shop/api', to: 'shop/db', type: 'read-write' },
  ],
};

describe('buildResilienceRecommendations', () => {
  it('emits circuit-breaker recommendations for structural SPOFs', () => {
    const simulation = runResilienceSimulation(ecommerceSchema, {
      faults: [{ nodeId: 'shop/payment', faultType: 'region-outage' }],
      entryPoints: ['shop/web'],
    });

    const recommendations = buildResilienceRecommendations({
      schema: ecommerceSchema,
      spofs: simulation.spofs,
      heat: simulation.heat,
      propagationStoppedAt: simulation.propagationStoppedAt,
      integrityHeat: simulation.integrityHeat,
      faultNodeIds: simulation.faultNodeIds,
    });

    expect(recommendations.some(r => r.kind === 'add-circuit-breaker')).toBe(true);
    expect(recommendations[0].priority).toBeGreaterThanOrEqual(
      recommendations[recommendations.length - 1]?.priority ?? 0
    );
    expect(recommendations.map(r => r.detail)).toEqual(simulation.advice);
  });
});

describe('buildRecommendations', () => {
  it('merges resilience and composite-risk recommendations for a simulated diagram', () => {
    const schema: SystemSchema = {
      ...ecommerceSchema,
      nodes: ecommerceSchema.nodes.map(node =>
        node.entityRef === 'shop/payment'
          ? {
              ...node,
              forensics: {
                hotspotScore: 0.8,
                complexity: 40,
                churn: 0.6,
                topAuthorPercent: 0.9,
                classifications: ['hotspot'],
              },
            }
          : node
      ),
    };

    const simulation = runResilienceSimulation(schema, {
      faults: [{ nodeId: 'shop/payment', faultType: 'region-outage' }],
      entryPoints: ['shop/web'],
    });

    const recommendations = buildRecommendations({ schema, simulation });

    expect(recommendations.some(r => r.kind === 'add-circuit-breaker')).toBe(true);
    expect(recommendations.some(r => r.kind === 'reduce-composite-risk')).toBe(true);
    expect(recommendations[0].evidence).toBeDefined();
  });

  it('includes refactor boundary recommendations when provided', () => {
    const recommendations = buildRecommendations({
      schema: ecommerceSchema,
      refactorBoundaries: [
        {
          id: 'shop/api|shop/payment',
          seedEntityRef: 'shop/api',
          seedName: 'API',
          members: [
            {
              entityRef: 'shop/api',
              name: 'API',
              filepath: 'src/api.ts',
              refactorScore: 50,
            },
            {
              entityRef: 'shop/payment',
              name: 'Payment',
              filepath: 'src/payment.ts',
              refactorScore: 40,
            },
          ],
          memberEntityRefs: ['shop/api', 'shop/payment'],
          memberFilepaths: ['src/api.ts', 'src/payment.ts'],
          aggregateRefactorScore: 90,
          signals: ['high-coupling', 'hotspot'],
          rationale: [],
          spansContainers: false,
        },
      ],
    });

    expect(recommendations.some(r => r.kind === 'refactor-extract-shared-logic')).toBe(true);
  });
});
