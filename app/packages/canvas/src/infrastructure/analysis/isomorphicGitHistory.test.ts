import { describe, expect, it } from 'vitest';
import git from 'isomorphic-git';
import { createMemoryGitFs } from './memoryGitFs';
import { loadGitHistoryFromFs } from './isomorphicGitHistory';

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
