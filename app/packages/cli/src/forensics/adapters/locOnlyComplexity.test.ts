import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocOnlyComplexityAdapter } from './locOnlyComplexity.ts';

const tempDirs: string[] = [];

function makeTempRepo(structure: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forensics-loc-'));
  tempDirs.push(root);
  for (const [relative, content] of Object.entries(structure)) {
    const absolute = path.join(root, relative);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content, 'utf8');
  }
  return root;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('LocOnlyComplexityAdapter', () => {
  it('returns LOC metrics with zero complexity for non-TS files', async () => {
    const root = makeTempRepo({
      'pkg/main.py': ['def f():', '    return 1', ''].join('\n'),
    });

    const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() };
    const adapter = new LocOnlyComplexityAdapter(logger, root);
    const metrics = await adapter.analyze(['pkg/main.py'], {
      sinceDays: 365,
      shortChurnDays: 30,
      hotspotThreshold: 0.5,
      complexityThreshold: 10,
      minSharedCommits: 5,
      couplingThreshold: 0.75,
      minChurnForComplexity: 0,
      glob: '**/*',
      ignore: [],
      include: [],
    });

    expect(metrics).toEqual([
      {
        path: 'pkg/main.py',
        complexity: 0,
        loc: 3,
        sloc: 2,
      },
    ]);
  });

  it('skips missing files and logs a warning', async () => {
    const root = makeTempRepo({});
    const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() };
    const adapter = new LocOnlyComplexityAdapter(logger, root);

    const metrics = await adapter.analyze(['missing.go'], {
      sinceDays: 365,
      shortChurnDays: 30,
      hotspotThreshold: 0.5,
      complexityThreshold: 10,
      minSharedCommits: 5,
      couplingThreshold: 0.75,
      minChurnForComplexity: 0,
      glob: '**/*',
      ignore: [],
      include: [],
    });

    expect(metrics).toEqual([]);
    expect(logger.warn).toHaveBeenCalled();
  });
});
