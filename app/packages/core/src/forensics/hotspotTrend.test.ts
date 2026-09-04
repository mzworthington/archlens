import { describe, expect, it } from 'vitest';
import { computeHotspotScores } from './hotspotScoring';
import {
  classifyHotspotScoreTrend,
  computeHotspotScoreByWeek,
  formatHotspotScoreTrend,
} from './hotspotTrend';

describe('computeHotspotScoreByWeek', () => {
  it('returns an empty map when no weekly churn series exist', () => {
    expect(
      computeHotspotScoreByWeek([
        { path: 'a.ts', complexity: 10 },
        { path: 'b.ts', complexity: 20, churnByWeek: [] },
      ])
    ).toEqual(new Map());
  });

  it('recomputes relative hotspotScore for each week using current complexity', () => {
    const series = computeHotspotScoreByWeek([
      { path: 'hot.ts', complexity: 20, churnByWeek: [1, 1, 50, 50] },
      { path: 'cold.ts', complexity: 2, churnByWeek: [50, 50, 1, 1] },
    ]);

    expect(series.get('hot.ts')).toEqual([
      computeHotspotScores([
        { path: 'hot.ts', complexity: 20, churn: 1 },
        { path: 'cold.ts', complexity: 2, churn: 50 },
      ]).get('hot.ts'),
      computeHotspotScores([
        { path: 'hot.ts', complexity: 20, churn: 1 },
        { path: 'cold.ts', complexity: 2, churn: 50 },
      ]).get('hot.ts'),
      computeHotspotScores([
        { path: 'hot.ts', complexity: 20, churn: 50 },
        { path: 'cold.ts', complexity: 2, churn: 1 },
      ]).get('hot.ts'),
      computeHotspotScores([
        { path: 'hot.ts', complexity: 20, churn: 50 },
        { path: 'cold.ts', complexity: 2, churn: 1 },
      ]).get('hot.ts'),
    ]);
    expect(series.get('hot.ts')?.[0]).toBe(0);
    expect(series.get('hot.ts')?.[3]).toBe(1);
  });

  it('pads missing later weeks with zero churn', () => {
    const series = computeHotspotScoreByWeek([
      { path: 'short.ts', complexity: 2, churnByWeek: [8] },
      { path: 'long.ts', complexity: 20, churnByWeek: [1, 8] },
    ]);

    expect(series.get('short.ts')).toHaveLength(2);
    expect(series.get('long.ts')?.[1]).toBe(1);
    expect(series.get('short.ts')?.[1]).toBe(0);
  });
});

describe('classifyHotspotScoreTrend', () => {
  it('returns null when there are fewer than two weeks', () => {
    expect(classifyHotspotScoreTrend([])).toBeNull();
    expect(classifyHotspotScoreTrend([0.4])).toBeNull();
  });

  it('labels the last up-to-4 weeks against the previous up-to-4 weeks', () => {
    expect(classifyHotspotScoreTrend([0, 0, 0, 0, 0.8, 0.9, 1, 1])).toBe('rising');
    expect(classifyHotspotScoreTrend([1, 1, 0.9, 0.8, 0, 0, 0, 0])).toBe('falling');
    expect(classifyHotspotScoreTrend([0.4, 0.41, 0.39, 0.4, 0.4, 0.42, 0.4, 0.41])).toBe('steady');
  });
});

describe('formatHotspotScoreTrend', () => {
  it('uses practitioner labels for direction', () => {
    expect(formatHotspotScoreTrend('rising')).toBe('getting worse');
    expect(formatHotspotScoreTrend('falling')).toBe('easing');
    expect(formatHotspotScoreTrend('steady')).toBe('steady');
  });
});
