import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { SourceFileListerAdapter } from './sourceFileLister.ts';

const tempDirs: string[] = [];

function makeTempRepo(structure: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forensics-lister-'));
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

describe('SourceFileListerAdapter', () => {
  it('lists multi-language source files from the configured glob', async () => {
    const root = makeTempRepo({
      'src/a.ts': 'export const a = 1;',
      'src/b.go': 'package main',
      'docs/readme.md': '# docs',
    });

    const lister = new SourceFileListerAdapter(root);
    const paths = await lister.listSourceFiles({
      sinceDays: 365,
      shortChurnDays: 30,
      hotspotThreshold: 0.5,
      complexityThreshold: 10,
      minSharedCommits: 5,
      couplingThreshold: 0.75,
      minChurnForComplexity: 0,
      glob: '**/*.{ts,go}',
      ignore: [],
      include: [],
    });

    expect(paths).toEqual(['src/a.ts', 'src/b.go']);
  });
});
