import { describe, it, expect } from 'vitest';
import {
  describeTruncation,
  pickSourceDirectory,
  walkBrowserSourceDirectory,
} from './browserSourceWalker';

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
    expect(result.truncationReasons).toEqual([]);
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

  it('prefers src/ over peripheral scripts when the source cap is hit', async () => {
    const root = dir('demo-repo', [
      ['tools', dir('tools', [['cli.ts', file('cli.ts', 'export const cli = 1;')]])],
      ['src', dir('src', [['app.ts', file('app.ts', 'export const app = 1;')]])],
    ]);

    const result = await walkBrowserSourceDirectory(root, { maxFiles: 1 });

    expect(result.files.map(f => f.relativePath)).toEqual(['src/app.ts']);
    expect(result.truncationReasons).toContain('files');
  });

  it('skips structural noise dirs such as e2e and stories', async () => {
    const root = dir('demo-repo', [
      ['e2e', dir('e2e', [['spec.ts', file('spec.ts', 'export const e2e = 1;')]])],
      [
        'src',
        dir('src', [
          [
            'stories',
            dir('stories', [['Button.stories.ts', file('Button.stories.ts', 'export {}')]]),
          ],
          ['a.ts', file('a.ts', 'export const a = 1;')],
        ]),
      ],
    ]);

    const result = await walkBrowserSourceDirectory(root);

    expect(result.files.map(f => f.relativePath)).toEqual(['src/a.ts']);
  });

  it('skips declaration files and includes .mjs/.cjs', async () => {
    const root = dir('demo-repo', [
      ['index.d.ts', file('index.d.ts', 'export {};')],
      ['loader.mjs', file('loader.mjs', 'export const load = 1;')],
      ['legacy.cjs', file('legacy.cjs', 'module.exports = 1;')],
    ]);

    const result = await walkBrowserSourceDirectory(root);

    expect(result.files.map(f => f.relativePath).sort()).toEqual(['legacy.cjs', 'loader.mjs']);
  });

  it('stops and marks truncated once the cumulative byte budget is exhausted', async () => {
    const root = dir('demo-repo', [
      ['a.ts', file('a.ts', 'x'.repeat(60))],
      ['b.ts', file('b.ts', 'y'.repeat(60))],
      ['c.ts', file('c.ts', 'z'.repeat(60))],
    ]);

    const result = await walkBrowserSourceDirectory(root, { maxTotalBytes: 100 });

    expect(result.truncated).toBe(true);
    expect(result.truncationReasons).toContain('bytes');
    expect(result.sourceFileCount).toBe(1);
  });

  it('marks metadata truncation when manifests exceed the metadata budget', async () => {
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

    const result = await walkBrowserSourceDirectory(root, { maxMetadataFiles: 1 });

    expect(result.files.filter(f => f.relativePath.endsWith('package.json'))).toHaveLength(1);
    expect(result.files.some(f => f.relativePath === 'package.json')).toBe(true);
    expect(result.truncationReasons).toContain('metadata');
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

describe('pickSourceDirectory', () => {
  it('reports unsupported when showDirectoryPicker is missing', async () => {
    const original = Object.getOwnPropertyDescriptor(window, 'showDirectoryPicker');
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: undefined,
    });
    await expect(pickSourceDirectory()).resolves.toEqual({ status: 'unsupported' });
    if (original) {
      Object.defineProperty(window, 'showDirectoryPicker', original);
    } else {
      Reflect.deleteProperty(window, 'showDirectoryPicker');
    }
  });
});

describe('describeTruncation', () => {
  it('explains which budgets truncated the scan', () => {
    expect(describeTruncation(['files', 'bytes'], 12)).toContain('source file cap (12)');
    expect(describeTruncation(['files', 'bytes'], 12)).toContain('total size budget');
    expect(describeTruncation([], 12)).toBe('');
  });
});
