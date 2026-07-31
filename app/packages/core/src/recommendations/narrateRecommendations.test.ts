import { describe, expect, it, vi } from 'vitest';
import type { Recommendation } from './types';
import { narrateRecommendations } from './narrateRecommendations';

const base: Recommendation = {
  id: 'add-circuit-breaker:shop/api',
  kind: 'add-circuit-breaker',
  source: 'chaoslens',
  targetEntityRef: 'shop/api',
  targetName: 'API',
  title: 'Add a circuit breaker',
  detail: 'Add a circuit breaker on API.',
  priority: 95,
  evidence: {
    simulation: { blastRadius: 0.8, isSpof: true },
  },
  actions: [],
};

describe('narrateRecommendations', () => {
  it('returns input unchanged without a narrator', async () => {
    const result = await narrateRecommendations([base]);
    expect(result).toEqual([base]);
    expect(result[0].narration).toBeUndefined();
  });

  it('attaches narration from a narrator without changing priority or evidence', async () => {
    const narrate = vi.fn().mockResolvedValue({
      provider: 'adviceLens' as const,
      detail: 'Set a 200ms timeout with fallback cache on API.',
      citations: ['blastRadius:0.80', 'isSpof:true'],
      model: 'test-model',
    });

    const result = await narrateRecommendations([base], {
      estateLabel: 'checkout',
      narrator: { narrate },
    });

    expect(narrate).toHaveBeenCalledWith({
      recommendation: base,
      citations: ['blastRadius:0.80', 'isSpof:true'],
      estateLabel: 'checkout',
    });
    expect(result[0].priority).toBe(95);
    expect(result[0].evidence).toEqual(base.evidence);
    expect(result[0].narration).toEqual({
      provider: 'adviceLens',
      detail: 'Set a 200ms timeout with fallback cache on API.',
      citations: ['blastRadius:0.80', 'isSpof:true'],
      model: 'test-model',
    });
  });
});
