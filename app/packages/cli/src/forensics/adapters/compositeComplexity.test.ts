import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompositeComplexityAdapter } from './compositeComplexity.ts';

const tempDirs: string[] = [];

function makeTempRepo(structure: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forensics-composite-'));
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

describe('CompositeComplexityAdapter', () => {
  it('routes TypeScript to cyclomatic analysis and other languages to LOC-only', async () => {
    const root = makeTempRepo({
      'src/a.ts': 'export function f(x: number) { if (x) return 1; return 0; }',
      'src/b.py': 'x = 1\n',
    });

    const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() };
    const adapter = new CompositeComplexityAdapter(logger, root);
    const metrics = await adapter.analyze(['src/a.ts', 'src/b.py'], defaultOptions);

    const ts = metrics.find(m => m.path === 'src/a.ts')!;
    const py = metrics.find(m => m.path === 'src/b.py')!;

    expect(ts.complexity).toBeGreaterThan(0);
    expect(py.complexity).toBe(0);
    expect(py.sloc).toBeGreaterThan(0);
  });
});
