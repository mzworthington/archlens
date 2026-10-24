import { describe, expect, it } from 'vitest';
import { createDirectoryHandleFs } from './directoryHandleFs';
import { dir, file } from './test/directoryHandleFixture';

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
