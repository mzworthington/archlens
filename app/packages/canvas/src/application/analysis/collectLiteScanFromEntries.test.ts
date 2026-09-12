import { describe, expect, it } from 'vitest';
import { collectLiteScanFromEntries, stripSharedArchiveRoot } from './collectLiteScanFromEntries';

function entry(relativePath: string, content: string) {
  return { relativePath, content, size: content.length };
}

describe('stripSharedArchiveRoot', () => {
  it('strips a single wrapping folder from a ZIP listing', () => {
    const { directoryName, relativize } = stripSharedArchiveRoot([
      'demo-repo/src/a.ts',
      'demo-repo/package.json',
    ]);
    expect(directoryName).toBe('demo-repo');
    expect(relativize('demo-repo/src/a.ts')).toBe('src/a.ts');
  });

  it('does not strip a src/ tree that is the project layout', () => {
    const { directoryName, relativize } = stripSharedArchiveRoot(['src/a.ts', 'src/b.ts']);
    expect(directoryName).toBeNull();
    expect(relativize('src/a.ts')).toBe('src/a.ts');
  });

  it('does not strip when files sit at the archive root', () => {
    const { directoryName, relativize } = stripSharedArchiveRoot(['src/a.ts', 'package.json']);
    expect(directoryName).toBeNull();
    expect(relativize('src/a.ts')).toBe('src/a.ts');
  });
});

describe('collectLiteScanFromEntries', () => {
  it('collects sources plus analyzer manifests and counts only sources', () => {
    const result = collectLiteScanFromEntries(
      [
        entry('package.json', '{"name":"demo"}'),
        entry('pnpm-workspace.yaml', 'packages:\n  - packages/*\n'),
        entry('README.md', '# demo'),
        entry('src/a.ts', 'export const a = 1;'),
      ],
      { directoryName: 'demo-repo' }
    );

    expect(result.files.map(f => f.relativePath).sort()).toEqual([
      'package.json',
      'pnpm-workspace.yaml',
      'src/a.ts',
    ]);
    expect(result.sourceFileCount).toBe(1);
    expect(result.truncated).toBe(false);
    expect(result.directoryName).toBe('demo-repo');
  });

  it('honours .gitignore the way a folder scan does', () => {
    const result = collectLiteScanFromEntries(
      [
        entry('.gitignore', 'ignored/\n'),
        entry('src/keep.ts', 'export const keep = 1;'),
        entry('ignored/skip.ts', 'export const skip = 1;'),
      ],
      { directoryName: 'demo-repo' }
    );

    expect(result.files.map(f => f.relativePath)).toEqual(['src/keep.ts']);
  });

  it('applies nested gitignore patterns only under that directory', () => {
    const result = collectLiteScanFromEntries(
      [
        entry('pkg/.gitignore', '/scratch\nskip.ts\n'),
        entry('pkg/keep.ts', 'export const keep = 1;'),
        entry('pkg/skip.ts', 'export const skip = 1;'),
        entry('pkg/scratch/gone.ts', 'export const gone = 1;'),
        entry('scratch/keep.ts', 'export const rootScratch = 1;'),
        entry('sibling/skip.ts', 'export const sibling = 1;'),
      ],
      { directoryName: 'demo-repo' }
    );

    expect(result.files.map(f => f.relativePath).sort()).toEqual([
      'pkg/keep.ts',
      'scratch/keep.ts',
      'sibling/skip.ts',
    ]);
  });

  it('prefers src/ over peripheral scripts when the source cap is hit', () => {
    const result = collectLiteScanFromEntries(
      [
        entry('tools/cli.ts', 'export const cli = 1;'),
        entry('src/app.ts', 'export const app = 1;'),
      ],
      { directoryName: 'demo-repo', maxFiles: 1 }
    );

    expect(result.files.map(f => f.relativePath)).toEqual(['src/app.ts']);
    expect(result.truncationReasons).toContain('files');
  });

  it('skips structural noise dirs such as e2e and stories', () => {
    const result = collectLiteScanFromEntries(
      [
        entry('e2e/spec.ts', 'export const e2e = 1;'),
        entry('src/stories/Button.stories.ts', 'export {}'),
        entry('src/a.ts', 'export const a = 1;'),
      ],
      { directoryName: 'demo-repo' }
    );

    expect(result.files.map(f => f.relativePath)).toEqual(['src/a.ts']);
  });

  it('skips traversal paths and node_modules', () => {
    const result = collectLiteScanFromEntries(
      [
        entry('../escape.ts', 'export const escape = 1;'),
        entry('node_modules/pkg/index.ts', 'export const n = 1;'),
        entry('src/ok.ts', 'export const ok = 1;'),
      ],
      { directoryName: 'demo-repo' }
    );

    expect(result.files.map(f => f.relativePath)).toEqual(['src/ok.ts']);
  });

  it('uses a wrapping folder as the scan name', () => {
    const result = collectLiteScanFromEntries(
      [entry('checkout/src/a.ts', 'export const a = 1;'), entry('checkout/package.json', '{}')],
      { directoryName: 'upload.zip' }
    );

    expect(result.directoryName).toBe('checkout');
    expect(result.files.map(f => f.relativePath).sort()).toEqual(['package.json', 'src/a.ts']);
  });
});
