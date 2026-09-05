import { describe, expect, it, vi } from 'vitest';
import type { WorkspacePort } from '../../core';
import { downloadScanYamlFileName, writeWorkspaceYamlFiles } from './writeWorkspaceYamlFiles';

function fakePort(write: WorkspacePort['writeFile']): Pick<WorkspacePort, 'writeFile'> {
  return { writeFile: write };
}

describe('writeWorkspaceYamlFiles', () => {
  it('writes every YAML file through the workspace port', async () => {
    const writeFile = vi.fn(async () => true);
    const result = await writeWorkspaceYamlFiles(fakePort(writeFile), [
      { name: 'demo/context.yaml', content: 'level: context\n' },
      { name: 'demo/web/container.yaml', content: 'level: container\n' },
    ]);

    expect(result).toEqual({ ok: true });
    expect(writeFile).toHaveBeenCalledTimes(2);
    expect(writeFile).toHaveBeenCalledWith('demo/context.yaml', 'level: context\n');
    expect(writeFile).toHaveBeenCalledWith('demo/web/container.yaml', 'level: container\n');
  });

  it('stops and reports the first path that the port cannot write', async () => {
    const writeFile = vi.fn(async (path: string) => path !== 'b.yaml');
    const result = await writeWorkspaceYamlFiles(fakePort(writeFile), [
      { name: 'a.yaml', content: 'a' },
      { name: 'b.yaml', content: 'b' },
      { name: 'c.yaml', content: 'c' },
    ]);

    expect(result).toEqual({ ok: false, failedPath: 'b.yaml' });
    expect(writeFile).toHaveBeenCalledTimes(2);
    expect(writeFile).not.toHaveBeenCalledWith('c.yaml', 'c');
  });
});

describe('downloadScanYamlFileName', () => {
  it('flattens nested blueprint paths for a download filename', () => {
    expect(downloadScanYamlFileName('demo-repo/web/container.yaml')).toBe(
      'demo-repo__web__container.yaml'
    );
  });
});
