import { describe, expect, it } from 'vitest';
import { compareEstateRank, estateRankSignalFrom, sortByEstateRank } from './estateRank';

describe('estateRank', () => {
  it('builds rank signals from id and priority only', () => {
    const rec = {
      id: 'a',
      priority: 80,
      title: 'Rewrite me',
      detail: 'Also rewrite me',
      narration: {
        provider: 'adviceLens' as const,
        detail: 'Narrated copy',
        citations: [],
      },
    };

    expect(estateRankSignalFrom(rec)).toEqual({ id: 'a', priority: 80 });
  });

  it('orders by priority and ignores title, detail, and narration', () => {
    const lower = {
      id: 'low',
      priority: 10,
      title: 'AAA should not win',
      detail: 'Low detail',
    };
    const higher = {
      id: 'high',
      priority: 90,
      title: 'ZZZ should not lose',
      detail: 'High detail',
      narration: {
        provider: 'adviceLens' as const,
        detail: 'Fresh wording',
        citations: ['blastRadius:0.80'],
      },
    };

    expect(
      compareEstateRank(estateRankSignalFrom(lower), estateRankSignalFrom(higher))
    ).toBeGreaterThan(0);

    const resorted = sortByEstateRank([
      { recommendation: { ...higher, title: 'Edited after rank', detail: 'New detail' } },
      { recommendation: lower },
    ]);

    expect(resorted.map(item => item.recommendation.id)).toEqual(['high', 'low']);
  });
});
