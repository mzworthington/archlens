import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TreeSitterComplexityAdapter } from './treeSitterComplexity.ts';

const tempDirs: string[] = [];

function makeTempRepo(structure: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forensics-treesitter-'));
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

const defaultOptions = {
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
};

describe('TreeSitterComplexityAdapter', () => {
  it('computes cyclomatic complexity for TypeScript and Python', async () => {
    const root = makeTempRepo({
      'src/a.ts': `
export function f(a: number, b: number) {
  if (a && b) return a ? 1 : 2;
  for (const x of []) {}
  while (false) {}
  try { throw 0; } catch { }
  switch (a) { case 1: break; case 2: break; default: break; }
}
`,
      'src/b.py': `
def f(a, b):
    if a and b:
        return 1 if a else 2
    for x in []:
        pass
    while False:
        pass
    try:
        pass
    except:
        pass
`,
    });

    const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() };
    const adapter = new TreeSitterComplexityAdapter(logger, root);
    const metrics = await adapter.analyze(['src/a.ts', 'src/b.py'], defaultOptions);

    const ts = metrics.find(m => m.path === 'src/a.ts')!;
    const py = metrics.find(m => m.path === 'src/b.py')!;

    expect(ts.complexity).toBe(9);
    expect(ts.sloc).toBeGreaterThan(0);
    expect(py.complexity).toBe(7);
    expect(py.sloc).toBeGreaterThan(0);
  });

  it('skips missing files and logs a warning', async () => {
    const root = makeTempRepo({});
    const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() };
    const adapter = new TreeSitterComplexityAdapter(logger, root);

    const metrics = await adapter.analyze(['missing.go'], defaultOptions);

    expect(metrics).toEqual([]);
    expect(logger.warn).toHaveBeenCalled();
  });
});
