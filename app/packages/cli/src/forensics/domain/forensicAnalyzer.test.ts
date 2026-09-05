import { describe, expect, it, vi } from 'vitest';
import { ForensicAnalyzer } from './forensicAnalyzer.ts';
import type {
  ComplexityAnalyzerPort,
  GitHistoryPort,
  ImportGraphPort,
  ReporterPort,
  SourceFileListerPort,
} from './ports.ts';
import type { GitCommit, StructuralMetrics } from './types.ts';

class FakeLister implements SourceFileListerPort {
  constructor(public paths: string[] = []) {}
  async listSourceFiles(): Promise<string[]> {
    return this.paths;
  }
}

class FakeComplexity implements ComplexityAnalyzerPort {
  constructor(public metrics: StructuralMetrics[] = []) {}
  analyzedPaths: string[] = [];
  astPaths: string[] = [];
  async analyze(
    paths: string[],
    options: { skipAstPaths?: readonly string[] } = {}
  ): Promise<StructuralMetrics[]> {
    this.analyzedPaths = [...paths];
    const skipAst = new Set(options.skipAstPaths ?? []);
    this.astPaths = paths.filter(p => !skipAst.has(p));
    return this.metrics
      .filter(m => paths.includes(m.path))
      .map(m => (skipAst.has(m.path) ? { ...m, complexity: 0 } : m));
  }
}

class FakeGit implements GitHistoryPort {
  constructor(public commits: GitCommit[] = []) {}
  async loadHistory(): Promise<GitCommit[]> {
    return this.commits;
  }
}

class FakeImportGraph implements ImportGraphPort {
  async extractImports(): Promise<Map<string, string[]>> {
    return new Map();
  }
}

describe('ForensicAnalyzer', () => {
  it('correlates structure + history, classifies and reports', async () => {
    const lister = new FakeLister(['hot.ts', 'silo.ts']);
    const complexity = new FakeComplexity([
      { path: 'hot.ts', complexity: 20, loc: 100, sloc: 80 },
      { path: 'silo.ts', complexity: 15, loc: 50, sloc: 40 },
    ]);
    const git = new FakeGit([
      {
        hash: '1',
        authorEmail: 'a@ex.com',
        authorDate: new Date(),
        paths: ['hot.ts'],
      },
      {
        hash: '2',
        authorEmail: 'b@ex.com',
        authorDate: new Date(),
        paths: ['hot.ts'],
      },
      {
        hash: '3',
        authorEmail: 'solo@ex.com',
        authorDate: new Date(),
        paths: ['silo.ts'],
      },
    ]);
    const reporter: ReporterPort = { report: vi.fn(async () => undefined) };
    const analyzer = new ForensicAnalyzer({
      fileLister: lister,
      complexity,
      gitHistory: git,
      importGraph: new FakeImportGraph(),
      reporters: [reporter],
    });

    const report = await analyzer.run({
      rootPath: '/repo',
      now: () => new Date('2026-07-15T12:00:00.000Z'),
      options: {
        hotspotThreshold: 0.5,
        complexityThreshold: 10,
        minSharedCommits: 5,
        couplingThreshold: 0.75,
      },
    });

    expect(report.generatedAt).toBe('2026-07-15T12:00:00.000Z');
    expect(report.files).toHaveLength(2);

    const hot = report.files.find(f => f.path === 'hot.ts')!;
    const silo = report.files.find(f => f.path === 'silo.ts')!;

    expect(hot.churn).toBe(2);
    expect(hot.authorCount).toBe(2);
    expect(hot.classifications).toContain('hotspot');

    expect(silo.classifications).toContain('knowledge-silo');
    expect(silo.classifications).not.toContain('hotspot');

    expect(reporter.report).toHaveBeenCalledTimes(1);
  });

  it('attaches weekly hotspotScore series from lookback churn buckets', async () => {
    const now = new Date('2026-07-15T12:00:00.000Z');
    const lister = new FakeLister(['hot.ts', 'cold.ts']);
    const complexity = new FakeComplexity([
      { path: 'hot.ts', complexity: 20, loc: 100, sloc: 80 },
      { path: 'cold.ts', complexity: 2, loc: 10, sloc: 8 },
    ]);
    const git = new FakeGit([
      {
        hash: 'old-cold',
        authorEmail: 'a@ex.com',
        authorDate: new Date('2026-06-20T12:00:00.000Z'),
        paths: ['cold.ts'],
      },
      {
        hash: 'new-hot',
        authorEmail: 'b@ex.com',
        authorDate: new Date('2026-07-14T12:00:00.000Z'),
        paths: ['hot.ts'],
      },
    ]);
    const analyzer = new ForensicAnalyzer({
      fileLister: lister,
      complexity,
      gitHistory: git,
      importGraph: new FakeImportGraph(),
      reporters: [],
    });

    const report = await analyzer.run({
      rootPath: '/repo',
      now: () => now,
      options: { sinceDays: 28, shortChurnDays: 0 },
    });

    const hot = report.files.find(f => f.path === 'hot.ts')!;
    expect(hot.hotspotScoreByWeek).toHaveLength(4);
    expect(hot.hotspotScoreByWeek?.[0]).toBe(0);
    expect(hot.hotspotScoreByWeek?.[3]).toBe(1);
  });

  it('skips AST for cold files when minChurnForComplexity is set but still counts loc', async () => {
    const lister = new FakeLister(['cold.ts', 'warm.ts']);
    const complexity = new FakeComplexity([
      { path: 'warm.ts', complexity: 8, loc: 20, sloc: 18 },
      { path: 'cold.ts', complexity: 99, loc: 12, sloc: 10 },
    ]);
    const git = new FakeGit([
      {
        hash: '1',
        authorEmail: 'a@ex.com',
        authorDate: new Date(),
        paths: ['warm.ts'],
      },
      {
        hash: '2',
        authorEmail: 'a@ex.com',
        authorDate: new Date(),
        paths: ['warm.ts'],
      },
      {
        hash: '3',
        authorEmail: 'a@ex.com',
        authorDate: new Date(),
        paths: ['warm.ts'],
      },
      {
        hash: '4',
        authorEmail: 'a@ex.com',
        authorDate: new Date(),
        paths: ['cold.ts'],
      },
    ]);
    const analyzer = new ForensicAnalyzer({
      fileLister: lister,
      complexity,
      gitHistory: git,
      importGraph: new FakeImportGraph(),
      reporters: [],
    });

    const report = await analyzer.run({
      rootPath: '/repo',
      options: { minChurnForComplexity: 3 },
    });

    expect(complexity.analyzedPaths).toEqual(['cold.ts', 'warm.ts']);
    expect(complexity.astPaths).toEqual(['warm.ts']);
    const cold = report.files.find(f => f.path === 'cold.ts')!;
    expect(cold.complexity).toBe(0);
    expect(cold.loc).toBe(12);
    expect(cold.sloc).toBe(10);
    expect(report.files.find(f => f.path === 'warm.ts')!.complexity).toBe(8);
  });

  it('filters to hotspots only when requested', async () => {
    const lister = new FakeLister(['hot.ts', 'other.ts']);
    const complexity = new FakeComplexity([
      { path: 'hot.ts', complexity: 20, loc: 10, sloc: 10 },
      { path: 'other.ts', complexity: 2, loc: 10, sloc: 10 },
    ]);
    const git = new FakeGit([
      { hash: '1', authorEmail: 'a@ex.com', authorDate: new Date(), paths: ['hot.ts'] },
      { hash: '2', authorEmail: 'a@ex.com', authorDate: new Date(), paths: ['hot.ts'] },
      { hash: '3', authorEmail: 'a@ex.com', authorDate: new Date(), paths: ['other.ts'] },
    ]);
    const analyzer = new ForensicAnalyzer({
      fileLister: lister,
      complexity,
      gitHistory: git,
      importGraph: new FakeImportGraph(),
      reporters: [],
    });

    const report = await analyzer.run({
      rootPath: '/repo',
      hotspotsOnly: true,
      options: { hotspotThreshold: 0.5 },
    });

    expect(report.files.map(f => f.path)).toEqual(['hot.ts']);
  });
});
