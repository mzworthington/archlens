import { describe, it, expect } from 'vitest';
import { createMemoryScanWorkspacePort } from './memoryScanWorkspace';

describe('createMemoryScanWorkspacePort', () => {
  it('serves YAML from memory and reports directory name', async () => {
    const port = createMemoryScanWorkspacePort({
      directoryName: 'my-repo',
      files: [{ name: 'ctx/context.yaml', content: 'version: 1\n' }],
    });

    expect(port.getDirectoryName()).toBe('my-repo');
    expect(await port.hasPermission()).toBe(true);
    expect(await port.readFile('ctx/context.yaml')).toBe('version: 1\n');
    expect(await port.readDirectoryFiles()).toEqual([
      { name: 'ctx/context.yaml', content: 'version: 1\n' },
    ]);
    expect(await port.writeFile('x.yaml', 'nope')).toBe(false);
  });
});
