import { describe, it, expect } from 'vitest';
import { walkBrowserSourceDirectory } from './browserSourceWalker';

type Entry = [string, FileSystemHandle];

function file(name: string, content: string): FileSystemHandle {
  return {
    kind: 'file',
    name,
    getFile: async () => new File([content], name),
  } as unknown as FileSystemHandle;
}

function dir(name: string, entries: Entry[]): FileSystemDirectoryHandle {
  return {
    kind: 'directory',
    name,
    async *[Symbol.asyncIterator]() {
      for (const entry of entries) yield entry;
    },
  } as unknown as FileSystemDirectoryHandle;
}

describe('walkBrowserSourceDirectory', () => {
  it('collects sources plus analyzer manifests and counts only sources', async () => {
    const root = dir('demo-repo', [
      ['package.json', file('package.json', '{"name":"demo"}')],
      ['pnpm-workspace.yaml', file('pnpm-workspace.yaml', 'packages:\n  - packages/*\n')],
      ['README.md', file('README.md', '# demo')],
      ['src', dir('src', [['a.ts', file('a.ts', 'export const a = 1;')]])],
    ]);

    const result = await walkBrowserSourceDirectory(root);

    expect(result.files.map(f => f.relativePath).sort()).toEqual([
      'package.json',
      'pnpm-workspace.yaml',
      'src/a.ts',
    ]);
    expect(result.sourceFileCount).toBe(1);
    expect(result.truncated).toBe(false);
    expect(result.directoryName).toBe('demo-repo');
  });

  it('does not let manifests consume the source budget', async () => {
    const root = dir('demo-repo', [
      ['package.json', file('package.json', '{"name":"root"}')],
      [
        'packages',
        dir('packages', [
          ['a', dir('a', [['package.json', file('package.json', '{"name":"a"}')]])],
          ['b', dir('b', [['package.json', file('package.json', '{"name":"b"}')]])],
        ]),
      ],
      ['src', dir('src', [['a.ts', file('a.ts', 'export const a = 1;')]])],
    ]);

    const result = await walkBrowserSourceDirectory(root, { maxFiles: 1 });

    expect(result.sourceFileCount).toBe(1);
    expect(result.files.filter(f => f.relativePath.endsWith('package.json'))).toHaveLength(3);
    expect(result.files.some(f => f.relativePath === 'src/a.ts')).toBe(true);
  });

  it('stops and marks truncated once the cumulative byte budget is exhausted', async () => {
    const root = dir('demo-repo', [
      ['a.ts', file('a.ts', 'x'.repeat(60))],
      ['b.ts', file('b.ts', 'y'.repeat(60))],
      ['c.ts', file('c.ts', 'z'.repeat(60))],
    ]);

    const result = await walkBrowserSourceDirectory(root, { maxTotalBytes: 100 });

    expect(result.truncated).toBe(true);
    expect(result.sourceFileCount).toBe(1);
  });

  it('aborts the walk when the scan signal is cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    const root = dir('demo-repo', [['a.ts', file('a.ts', 'export const a = 1;')]]);

    await expect(
      walkBrowserSourceDirectory(root, { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'CancellationError' });
  });
});
