import { describe, expect, it } from 'vitest';
import { computeHotspotScores } from './hotspotScoring';

describe('computeHotspotScores', () => {
  it('returns empty map for empty input', () => {
    expect(computeHotspotScores([])).toEqual(new Map());
  });

  it('scores the red-zone file highest', () => {
    const scores = computeHotspotScores([
      { path: 'cold.ts', complexity: 1, churn: 1 },
      { path: 'hot.ts', complexity: 20, churn: 50 },
      { path: 'complex-stable.ts', complexity: 20, churn: 1 },
      { path: 'churny-simple.ts', complexity: 1, churn: 50 },
    ]);
    expect(scores.get('hot.ts')).toBe(1);
    expect(scores.get('cold.ts')).toBe(0);
    expect(scores.get('complex-stable.ts')).toBe(0);
    expect(scores.get('churny-simple.ts')).toBe(0);
  });

  it('uses structural-only scores when churn is flat zero', () => {
    const scores = computeHotspotScores([
      { path: 'simple.ts', complexity: 2, churn: 0 },
      { path: 'complex.ts', complexity: 20, churn: 0 },
    ]);
    expect(scores.get('complex.ts')).toBe(1);
    expect(scores.get('simple.ts')).toBe(0);
  });

  it('prefers line churn over commit churn when present', () => {
    const scores = computeHotspotScores([
      { path: 'commits.ts', complexity: 5, churn: 50, lineChurn: 0 },
      { path: 'lines.ts', complexity: 10, churn: 1, lineChurn: 200 },
    ]);
    expect(scores.get('lines.ts')).toBe(1);
    expect(scores.get('commits.ts')).toBe(0);
  });
});
