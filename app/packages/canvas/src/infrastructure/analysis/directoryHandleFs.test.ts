import { describe, expect, it } from 'vitest';
import { createDirectoryHandleFs } from './directoryHandleFs';

type Entry = [string, FileSystemHandle];

function file(name: string, content: string): FileSystemFileHandle {
  return {
    kind: 'file',
    name,
    getFile: async () => new File([content], name),
  } as unknown as FileSystemFileHandle;
}

function dir(name: string, entries: Entry[]): FileSystemDirectoryHandle {
  const handle = {
    kind: 'directory' as const,
    name,
    async *entries() {
      for (const entry of entries) yield entry;
    },
    async getDirectoryHandle(child: string) {
      const found = entries.find(([n, h]) => n === child && h.kind === 'directory');
      if (!found) throw new Error('not found');
      return found[1] as FileSystemDirectoryHandle;
    },
    async getFileHandle(child: string) {
      const found = entries.find(([n, h]) => n === child && h.kind === 'file');
      if (!found) throw new Error('not found');
      return found[1] as FileSystemFileHandle;
    },
  };
  return handle as unknown as FileSystemDirectoryHandle;
}

describe('createDirectoryHandleFs', () => {
  it('reads nested files and directories for isomorphic-git', async () => {
    const root = dir('repo', [
      ['.git', dir('.git', [['HEAD', file('HEAD', 'ref: refs/heads/main\n')]])],
      ['src', dir('src', [['a.ts', file('a.ts', 'export const a = 1;\n')]])],
    ]);
    const fs = createDirectoryHandleFs(root);

    await expect(fs.promises.readdir('/')).resolves.toEqual(['.git', 'src']);
    await expect(fs.promises.readFile('/.git/HEAD', { encoding: 'utf8' })).resolves.toBe(
      'ref: refs/heads/main\n'
    );
    const stat = await fs.promises.stat('/src');
    expect(stat.isDirectory()).toBe(true);
    expect((await fs.promises.stat('/src/a.ts')).isFile()).toBe(true);
  });
});
