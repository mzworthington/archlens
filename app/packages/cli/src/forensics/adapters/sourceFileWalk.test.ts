import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { listFilesForGlob, parseForensicsGlobPattern } from './sourceFileWalk.ts';

const tempDirs: string[] = [];

function makeTempRepo(structure: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forensics-walk-'));
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

describe('parseForensicsGlobPattern', () => {
  it('parses brace expansion into extensions', () => {
    const cwd = '/repo';
    expect(parseForensicsGlobPattern(cwd, '**/*.{ts,py}')).toMatchObject({
      dir: '/repo',
      extensions: ['.ts', '.py'],
    });
  });

  it('falls back to common extensions when pattern has no brace block', () => {
    expect(parseForensicsGlobPattern('/repo', '**/src/**').extensions).toContain('.ts');
    expect(parseForensicsGlobPattern('/repo', '**/src/**').extensions).toContain('.go');
  });
});

describe('listFilesForGlob', () => {
  it('returns repo-relative paths for matching extensions', () => {
    const root = makeTempRepo({
      'src/a.ts': 'export const a = 1;',
      'src/b.py': 'x = 1',
      'src/readme.md': '# docs',
      'dist/a.js': 'compiled',
    });

    const files = listFilesForGlob(root, '**/*.{ts,py}', () => false);
    expect(files).toEqual(['src/a.ts', 'src/b.py']);
  });

  it('honours shouldSkip callback', () => {
    const root = makeTempRepo({
      'src/keep.ts': 'ok',
      'src/skip.ts': 'no',
    });

    const files = listFilesForGlob(root, '**/*.ts', p => p.includes('skip'));
    expect(files).toEqual(['src/keep.ts']);
  });
});
