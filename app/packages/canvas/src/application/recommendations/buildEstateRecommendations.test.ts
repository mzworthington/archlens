import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import {
  buildEstateRecommendations,
  filterEstateRecommendations,
} from './buildEstateRecommendations';
import { rankEstateItems } from './rankEstateItems';
import { sortByEstateRank } from './estateRank';

function stressSchema(): SystemSchema {
  return {
    name: 'Shop containers',
    version: '1.0.0',
    level: 'container',
    entityRef: 'shop',
    nodes: [
      { entityRef: 'shop/api', name: 'API', type: 'rest-api' },
      { entityRef: 'shop/orders', name: 'Orders', type: 'background-worker' },
      { entityRef: 'shop/payments', name: 'Payments', type: 'background-worker' },
      { entityRef: 'shop/inventory', name: 'Inventory', type: 'database' },
    ],
    dependencies: [
      { from: 'shop/api', to: 'shop/orders', type: 'direct-call' },
      { from: 'shop/api', to: 'shop/payments', type: 'direct-call' },
      { from: 'shop/orders', to: 'shop/inventory', type: 'direct-call' },
      { from: 'shop/payments', to: 'shop/inventory', type: 'direct-call' },
    ],
  };
}

describe('buildEstateRecommendations', () => {
  it('returns an empty report when the estate has no diagrams', () => {
    const report = buildEstateRecommendations([]);

    expect(report.recommendations).toEqual([]);
    expect(report.diagrams).toEqual([]);
    expect(report.summary).toEqual({
      diagramCount: 0,
      totalScenarios: 0,
      worstOverallSla: 100,
      totalSpofs: 0,
      recommendationCount: 0,
    });
  });

  it('returns merged resilience and refactor recommendations for loaded diagrams', () => {
    const systems = [
      {
        path: 'shop-containers.yaml',
        name: 'Shop containers',
        schema: stressSchema(),
      },
    ];

    const report = buildEstateRecommendations(systems);

    expect(report.summary.diagramCount).toBe(1);
    expect(report.summary.totalScenarios).toBeGreaterThan(0);
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations[0]!.diagramName).toBe('Shop containers');
    expect(report.recommendations[0]!.priority).toBeGreaterThanOrEqual(
      report.recommendations[report.recommendations.length - 1]!.priority
    );
  });

  it('filters recommendations by source and search query', () => {
    const systems = [
      {
        path: 'shop-containers.yaml',
        name: 'Shop containers',
        schema: stressSchema(),
      },
    ];
    const report = buildEstateRecommendations(systems);

    const chaosOnly = filterEstateRecommendations(report.recommendations, {
      systems,
      source: 'chaoslens',
    });
    expect(chaosOnly.every(recommendation => recommendation.source === 'chaoslens')).toBe(true);

    const searched = filterEstateRecommendations(report.recommendations, {
      systems,
      query: 'circuit breaker',
    });
    expect(searched.length).toBeGreaterThan(0);
    expect(
      searched.some(
        recommendation =>
          recommendation.title.toLowerCase().includes('circuit breaker') ||
          recommendation.detail.toLowerCase().includes('circuit breaker')
      )
    ).toBe(true);
  });

  it('sorts estate items by descending recommendation priority', () => {
    const systems = [
      {
        path: 'shop-containers.yaml',
        name: 'Shop containers',
        schema: stressSchema(),
      },
    ];

    const { items } = rankEstateItems(systems);
    expect(items.length).toBeGreaterThan(1);
    expect(items[0]!.recommendation.priority).toBeGreaterThanOrEqual(
      items[items.length - 1]!.recommendation.priority
    );
  });

  it('keeps rank order when narration copy is edited', () => {
    const systems = [
      {
        path: 'shop-containers.yaml',
        name: 'Shop containers',
        schema: stressSchema(),
      },
    ];

    const { items } = rankEstateItems(systems);
    const originalIds = items.map(item => item.recommendation.id);
    const rewritten = items.map((item, index) => ({
      ...item,
      recommendation: {
        ...item.recommendation,
        title: `Rewritten title ${index}`,
        detail: `Rewritten detail ${index}`,
        narration: {
          provider: 'adviceLens' as const,
          detail: `Narration ${index}`,
          citations: [],
        },
      },
    }));

    expect(sortByEstateRank(rewritten).map(item => item.recommendation.id)).toEqual(originalIds);
  });

  it('returns an empty ranking when the estate has no diagrams', () => {
    const { items, summary, diagrams, report } = rankEstateItems([]);

    expect(items).toEqual([]);
    expect(diagrams).toEqual([]);
    expect(report.recommendations).toEqual([]);
    expect(summary).toEqual({
      diagramCount: 0,
      totalScenarios: 0,
      worstOverallSla: 100,
      totalSpofs: 0,
      recommendationCount: 0,
    });
  });
});
