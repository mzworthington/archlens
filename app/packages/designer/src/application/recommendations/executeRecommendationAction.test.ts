import { describe, expect, it, vi } from 'vitest';
import type { RecommendationAction } from '@archlens/core/recommendations';
import { executeRecommendationAction } from './executeRecommendationAction';

function context(overrides: Record<string, unknown> = {}) {
  return {
    loadedSystems: [
      {
        path: 'shop.yaml',
        name: 'Shop',
        schema: {
          name: 'Shop',
          version: '1.0.0',
          level: 'component' as const,
          nodes: [
            {
              entityRef: 'shop/api',
              name: 'API',
              type: 'rest-api' as const,
              forensics: { hotspotScore: 0.5, classifications: ['hotspot' as const] },
            },
          ],
          dependencies: [],
        },
      },
    ],
    selectSystem: vi.fn(async () => undefined),
    setLocation: vi.fn(),
    simulateResilienceFaultAtNode: vi.fn(),
    setResilienceSafeguard: vi.fn(),
    setResilienceMode: vi.fn(),
    setResiliencePanelTab: vi.fn(),
    openRefactorPlan: vi.fn(),
    ...overrides,
  };
}

describe('executeRecommendationAction', () => {
  it('opens refactor plan for review-refactor-plan actions', async () => {
    const openRefactorPlan = vi.fn();
    const action: RecommendationAction = {
      kind: 'review-refactor-plan',
      label: 'Review refactor plan',
      targetEntityRef: 'shop/api',
    };

    const result = await executeRecommendationAction(action, context({ openRefactorPlan }));
    expect(result.ok).toBe(true);
    expect(openRefactorPlan).toHaveBeenCalled();
  });

  it('navigates to canvas and enables circuit breaker safeguards', async () => {
    const setResilienceSafeguard = vi.fn();
    const setLocation = vi.fn();
    const action: RecommendationAction = {
      kind: 'enable-circuit-breaker',
      label: 'Enable circuit breaker',
      targetEntityRef: 'shop/api',
    };

    const result = await executeRecommendationAction(
      action,
      context({ setResilienceSafeguard, setLocation })
    );

    expect(result.ok).toBe(true);
    expect(setLocation).toHaveBeenCalledWith('/workspace/Shop');
    expect(setResilienceSafeguard).toHaveBeenCalledWith('shop/api', 'circuitBreaker', true);
  });

  it('runs a failure simulation for timeout review actions', async () => {
    const simulateResilienceFaultAtNode = vi.fn();
    const action: RecommendationAction = {
      kind: 'review-timeouts',
      label: 'Review timeouts',
      targetEntityRef: 'shop/api',
    };

    const result = await executeRecommendationAction(
      action,
      context({ simulateResilienceFaultAtNode })
    );

    expect(result.ok).toBe(true);
    expect(simulateResilienceFaultAtNode).toHaveBeenCalledWith('shop/api');
  });
});
