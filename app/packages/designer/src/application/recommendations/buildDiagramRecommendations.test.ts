import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import { runResilienceSimulation } from '@archlens/core/resilience';
import {
  buildDiagramRecommendations,
  recommendationsForEntity,
} from './buildDiagramRecommendations';

const schema: SystemSchema = {
  entityRef: 'blueprint/chaoslens-stress/ecommerce',
  name: 'E-Commerce',
  version: '1.0.0',
  level: 'container',
  nodes: [
    {
      entityRef: 'blueprint/chaoslens-stress/ecommerce/payment',
      name: 'Payment',
      type: 'microservice',
      forensics: {
        hotspotScore: 0.7,
        complexity: 30,
        churn: 0.5,
        topAuthorPercent: 0.8,
      },
    },
    { entityRef: 'blueprint/chaoslens-stress/ecommerce/api', name: 'API', type: 'rest-api' },
    { entityRef: 'blueprint/chaoslens-stress/ecommerce/web', name: 'Web', type: 'web-app' },
  ],
  dependencies: [
    {
      from: 'blueprint/chaoslens-stress/ecommerce/web',
      to: 'blueprint/chaoslens-stress/ecommerce/api',
      type: 'direct-call',
    },
    {
      from: 'blueprint/chaoslens-stress/ecommerce/api',
      to: 'blueprint/chaoslens-stress/ecommerce/payment',
      type: 'direct-call',
    },
  ],
};

describe('buildDiagramRecommendations', () => {
  it('merges resilience and refactor recommendations for an active simulation', () => {
    const simulation = runResilienceSimulation(schema, {
      faults: [
        { nodeId: 'blueprint/chaoslens-stress/ecommerce/payment', faultType: 'region-outage' },
      ],
      entryPoints: ['blueprint/chaoslens-stress/ecommerce/web'],
    });

    const recommendations = buildDiagramRecommendations({ schema, simulation });
    expect(recommendations.length).toBeGreaterThan(0);
    expect(
      recommendations.some(
        recommendation =>
          recommendation.kind === 'review-timeouts-fallbacks' ||
          recommendation.kind === 'reduce-composite-risk'
      )
    ).toBe(true);
  });

  it('filters recommendations to an offender entity and boundary members', () => {
    const simulation = runResilienceSimulation(schema, {
      faults: [
        { nodeId: 'blueprint/chaoslens-stress/ecommerce/payment', faultType: 'region-outage' },
      ],
    });
    const recommendations = buildDiagramRecommendations({
      schema,
      simulation,
      boundary: {
        id: 'payment|api',
        seedEntityRef: 'blueprint/chaoslens-stress/ecommerce/payment',
        seedName: 'Payment',
        members: [
          {
            entityRef: 'blueprint/chaoslens-stress/ecommerce/payment',
            name: 'Payment',
            refactorScore: 40,
          },
          {
            entityRef: 'blueprint/chaoslens-stress/ecommerce/api',
            name: 'API',
            refactorScore: 20,
          },
        ],
        memberEntityRefs: [
          'blueprint/chaoslens-stress/ecommerce/payment',
          'blueprint/chaoslens-stress/ecommerce/api',
        ],
        memberFilepaths: [],
        aggregateRefactorScore: 60,
        signals: ['high-coupling'],
        rationale: [],
        spansContainers: false,
      },
    });

    const scoped = recommendationsForEntity(
      recommendations,
      'blueprint/chaoslens-stress/ecommerce/payment',
      ['blueprint/chaoslens-stress/ecommerce/payment', 'blueprint/chaoslens-stress/ecommerce/api']
    );
    expect(scoped.length).toBeGreaterThan(0);
    expect(scoped.every(r => r.priority <= recommendations[0]!.priority + 100)).toBe(true);
  });
});
