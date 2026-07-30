import { describe, expect, it } from 'vitest';
import { aggregateFileHistory, computeChurnByWeek, filterCommitsInWindow } from './gitHistory';
import type { GitCommit } from './gitHistory';

describe('computeChurnByWeek', () => {
  it('buckets commits into weekly counts oldest-first', () => {
    const referenceDate = new Date('2026-02-07T12:00:00Z');
    const commits: GitCommit[] = [
      {
        hash: 'old',
        authorEmail: 'a@ex.com',
        authorDate: new Date('2026-01-12T12:00:00Z'),
        paths: ['a.ts'],
      },
      {
        hash: 'mid',
        authorEmail: 'a@ex.com',
        authorDate: new Date('2026-01-20T12:00:00Z'),
        paths: ['a.ts'],
      },
      {
        hash: 'new',
        authorEmail: 'b@ex.com',
        authorDate: new Date('2026-02-05T12:00:00Z'),
        paths: ['a.ts', 'b.ts'],
      },
    ];

    const weeks = computeChurnByWeek(commits, 'a.ts', 28, referenceDate);
    expect(weeks).toHaveLength(4);
    expect(weeks).toEqual([1, 1, 0, 1]);
    expect(computeChurnByWeek(commits, 'b.ts', 28, referenceDate)).toEqual([0, 0, 0, 1]);
  });
});

describe('filterCommitsInWindow', () => {
  it('keeps only commits within the window', () => {
    const referenceDate = new Date('2026-02-07T12:00:00Z');
    const commits: GitCommit[] = [
      {
        hash: 'old',
        authorEmail: 'a@ex.com',
        authorDate: new Date('2025-01-01T12:00:00Z'),
        paths: ['a.ts'],
      },
      {
        hash: 'recent',
        authorEmail: 'b@ex.com',
        authorDate: new Date('2026-02-01T12:00:00Z'),
        paths: ['a.ts'],
      },
    ];

    expect(filterCommitsInWindow(commits, 30, referenceDate)).toHaveLength(1);
    expect(filterCommitsInWindow(commits, 30, referenceDate)[0]?.hash).toBe('recent');
  });
});

describe('aggregateFileHistory', () => {
  it('computes churn, authorCount, and topAuthorPercent', () => {
    const commits: GitCommit[] = [
      {
        hash: '1',
        authorEmail: 'alice@ex.com',
        authorDate: new Date(),
        paths: ['a.ts'],
      },
      {
        hash: '2',
        authorEmail: 'alice@ex.com',
        authorDate: new Date(),
        paths: ['a.ts'],
      },
      {
        hash: '3',
        authorEmail: 'bob@ex.com',
        authorDate: new Date(),
        paths: ['a.ts', 'b.ts'],
      },
    ];

    const traits = aggregateFileHistory(commits, ['a.ts', 'b.ts', 'c.ts']);
    const a = traits.find(t => t.path === 'a.ts')!;
    const b = traits.find(t => t.path === 'b.ts')!;
    const c = traits.find(t => t.path === 'c.ts')!;

    expect(a.churn).toBe(3);
    expect(a.authorCount).toBe(2);
    expect(a.topAuthorPercent).toBeCloseTo(2 / 3, 5);
    expect(a.authors).toEqual([
      { email: 'alice@ex.com', commits: 2 },
      { email: 'bob@ex.com', commits: 1 },
    ]);

    expect(b.churn).toBe(1);
    expect(b.authorCount).toBe(1);
    expect(b.topAuthorPercent).toBe(1);

    expect(c.churn).toBe(0);
    expect(c.authorCount).toBe(0);
    expect(c.topAuthorPercent).toBe(0);
  });

  it('includes churnByWeek when sinceDays is provided', () => {
    const referenceDate = new Date('2026-01-28T12:00:00Z');
    const commits: GitCommit[] = [
      {
        hash: '1',
        authorEmail: 'alice@ex.com',
        authorDate: new Date('2026-01-10T12:00:00Z'),
        paths: ['a.ts'],
      },
      {
        hash: '2',
        authorEmail: 'alice@ex.com',
        authorDate: new Date('2026-01-24T12:00:00Z'),
        paths: ['a.ts'],
      },
    ];

    const traits = aggregateFileHistory(commits, ['a.ts'], {
      sinceDays: 28,
      referenceDate,
    });
    expect(traits[0].churnByWeek).toBeDefined();
    expect(traits[0].churnByWeek?.reduce((sum, n) => sum + n, 0)).toBe(2);
  });

  it('filters churn to a shorter window when windowDays is set', () => {
    const referenceDate = new Date('2026-02-07T12:00:00Z');
    const commits: GitCommit[] = [
      {
        hash: 'old',
        authorEmail: 'a@ex.com',
        authorDate: new Date('2025-06-01T12:00:00Z'),
        paths: ['a.ts'],
      },
      {
        hash: 'recent',
        authorEmail: 'b@ex.com',
        authorDate: new Date('2026-02-01T12:00:00Z'),
        paths: ['a.ts'],
      },
    ];

    const long = aggregateFileHistory(commits, ['a.ts'], {
      sinceDays: 365,
      referenceDate,
    });
    const short = aggregateFileHistory(commits, ['a.ts'], {
      windowDays: 30,
      referenceDate,
    });

    expect(long[0].churn).toBe(2);
    expect(short[0].churn).toBe(1);
  });

  it('aggregates lineChurn from commit numstat when present', () => {
    const commits: GitCommit[] = [
      {
        hash: '1',
        authorEmail: 'alice@ex.com',
        authorDate: new Date(),
        paths: ['a.ts'],
        lineStats: { 'a.ts': { added: 10, removed: 5 } },
      },
      {
        hash: '2',
        authorEmail: 'alice@ex.com',
        authorDate: new Date(),
        paths: ['a.ts'],
        lineStats: { 'a.ts': { added: 3, removed: 2 } },
      },
      {
        hash: '3',
        authorEmail: 'bob@ex.com',
        authorDate: new Date(),
        paths: ['b.ts'],
        lineStats: { 'b.ts': { added: 100, removed: 0 } },
      },
    ];

    const traits = aggregateFileHistory(commits, ['a.ts', 'b.ts', 'c.ts']);
    expect(traits.find(t => t.path === 'a.ts')?.lineChurn).toBe(20);
    expect(traits.find(t => t.path === 'b.ts')?.lineChurn).toBe(100);
    expect(traits.find(t => t.path === 'c.ts')?.lineChurn).toBeUndefined();
  });
});
