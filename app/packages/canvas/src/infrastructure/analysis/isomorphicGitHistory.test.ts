import { describe, expect, it, vi } from 'vitest';
import git from 'isomorphic-git';
import { createMemoryGitFs } from './memoryGitFs';
import {
  collectGitProvenanceFromFs,
  loadBrowserGitHistory,
  loadGitHistoryFromFs,
} from './isomorphicGitHistory';

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

describe('loadGitHistoryFromFs', () => {
  it('reads non-merge commits and changed paths the way CLI git log would', async () => {
    const fs = createMemoryGitFs();
    const dir = '/repo';
    await fs.promises.mkdir(dir, { recursive: true });
    await git.init({ fs, dir, defaultBranch: 'main' });

    await fs.promises.mkdir(`${dir}/src`, { recursive: true });
    await fs.promises.writeFile(`${dir}/src/hot.ts`, 'export const hot = 1;\n');
    await git.add({ fs, dir, filepath: 'src/hot.ts' });
    const first = await git.commit({
      fs,
      dir,
      message: 'add hot',
      author: { name: 'Ada', email: 'ada@ex.com' },
    });

    await fs.promises.writeFile(`${dir}/src/hot.ts`, 'export const hot = 2;\n');
    await git.add({ fs, dir, filepath: 'src/hot.ts' });
    await git.commit({
      fs,
      dir,
      message: 'bump hot',
      author: { name: 'Ada', email: 'ada@ex.com' },
    });

    const commits = await loadGitHistoryFromFs({ fs, dir, sinceDays: 365 });
    expect(commits.length).toBeGreaterThanOrEqual(2);
    expect(commits.every(c => c.paths.includes('src/hot.ts'))).toBe(true);
    expect(commits.some(c => c.hash === first)).toBe(true);
    expect(commits[0]?.authorEmail).toBe('ada@ex.com');
  });
});

describe('loadBrowserGitHistory', () => {
  it('reports missing only when the folder has no git checkout', async () => {
    const root = dir('repo', [
      ['src', dir('src', [['a.ts', file('a.ts', 'export const a = 1;\n')]])],
    ]);
    await expect(loadBrowserGitHistory(root)).resolves.toEqual({ status: 'missing', commits: [] });
  });

  it('reports included when .git exists even if the lookback window is empty', async () => {
    const log = vi.spyOn(git, 'log').mockResolvedValue([]);
    const root = dir('repo', [['.git', dir('.git', [])]]);
    try {
      await expect(loadBrowserGitHistory(root)).resolves.toEqual({
        status: 'included',
        commits: [],
      });
    } finally {
      log.mockRestore();
    }
  });

  it('does not treat a gitdir file as a missing checkout', async () => {
    const root = dir('repo', [
      ['.git', file('.git', 'gitdir: /other/.git/worktrees/feat\n')],
      ['src', dir('src', [['a.ts', file('a.ts', 'export const a = 1;\n')]])],
    ]);
    const result = await loadBrowserGitHistory(root);
    expect(result.status).not.toBe('missing');
  });

  it('includes origin provenance from the directory handle checkout', async () => {
    const log = vi.spyOn(git, 'log').mockResolvedValue([]);
    const remotes = vi
      .spyOn(git, 'listRemotes')
      .mockResolvedValue([
        { remote: 'origin', url: 'https://github.com/mzworthington/RoMini.git' },
      ]);
    const branch = vi.spyOn(git, 'currentBranch').mockResolvedValue('main');
    const head = vi.spyOn(git, 'resolveRef').mockResolvedValue('abc123');
    const root = dir('repo', [['.git', dir('.git', [])]]);
    try {
      await expect(loadBrowserGitHistory(root)).resolves.toEqual({
        status: 'included',
        commits: [],
        source: {
          remoteUrl: 'https://github.com/mzworthington/RoMini',
          defaultBranch: 'main',
          scannedAtCommit: 'abc123',
          scanRoot: '.',
        },
      });
    } finally {
      log.mockRestore();
      remotes.mockRestore();
      branch.mockRestore();
      head.mockRestore();
    }
  });
});

describe('collectGitProvenanceFromFs', () => {
  it('reads origin URL, HEAD commit and current branch from the checkout', async () => {
    const fs = createMemoryGitFs();
    const dir = '/repo';
    await fs.promises.mkdir(dir, { recursive: true });
    await git.init({ fs, dir, defaultBranch: 'main' });
    await git.addRemote({
      fs,
      dir,
      remote: 'origin',
      url: 'git@github.com:mzworthington/RoMini.git',
    });
    await fs.promises.writeFile(`${dir}/README.md`, '# RoMini\n');
    await git.add({ fs, dir, filepath: 'README.md' });
    const oid = await git.commit({
      fs,
      dir,
      message: 'init',
      author: { name: 'Ada', email: 'ada@ex.com' },
    });

    const provenance = await collectGitProvenanceFromFs({ fs, dir });

    expect(provenance).toEqual({
      remoteUrl: 'https://github.com/mzworthington/RoMini',
      defaultBranch: 'main',
      scannedAtCommit: oid,
      scanRoot: '.',
    });
  });
});
