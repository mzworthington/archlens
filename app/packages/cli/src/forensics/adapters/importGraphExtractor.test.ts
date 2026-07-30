import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { RegexImportGraphAdapter } from './importGraphExtractor.ts';

const tempDirs: string[] = [];

function makeTempRepo(structure: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forensics-import-'));
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

describe('RegexImportGraphAdapter', () => {
  it('reads files from disk and returns relative import specifiers', async () => {
    const root = makeTempRepo({
      'src/a.ts': "import { b } from './b';",
      'src/b.ts': 'export const b = 1;',
    });

    const adapter = new RegexImportGraphAdapter(root);
    const imports = await adapter.extractImports(['src/a.ts', 'src/b.ts'], {
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

    expect(imports.get('src/a.ts')).toEqual(['./b']);
    expect(imports.has('src/b.ts')).toBe(false);
  });

  it('skips missing paths', async () => {
    const root = makeTempRepo({});
    const adapter = new RegexImportGraphAdapter(root);
    const imports = await adapter.extractImports(['missing.ts'], {
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

    expect(imports.size).toBe(0);
  });
});
