import { describe, expect, it, vi } from 'vitest';
import { collectBlueprintFiles, type WorkspaceFiles } from './collectBlueprintFiles';

describe('collectBlueprintFiles', () => {
  it('reads yaml under the blueprints folder of the one workspace root', async () => {
    const findYaml = vi.fn<WorkspaceFiles['findYaml']>(async () => [
      '/repo/blueprints/context.yaml',
    ]);
    const readText = vi.fn<WorkspaceFiles['readText']>(async filePath => `content:${filePath}`);
    const read = await collectBlueprintFiles(
      {
        workspaceFolders: () => ['/repo'],
        findYaml,
        readText,
        pickFolder: async () => undefined,
      },
      { blueprintsFolderSetting: 'blueprints' }
    );
    expect(findYaml).toHaveBeenCalledWith('/repo', 'blueprints');
    expect(read).toEqual({
      status: 'ok',
      files: [
        {
          path: '/repo/blueprints/context.yaml',
          content: 'content:/repo/blueprints/context.yaml',
        },
      ],
    });
  });

  it('asks for one folder and does not merge several roots', async () => {
    const pickFolder = vi.fn<WorkspaceFiles['pickFolder']>(async () => '/checkout');
    const findYaml = vi.fn<WorkspaceFiles['findYaml']>(async () => []);
    await collectBlueprintFiles(
      {
        workspaceFolders: () => ['/billing', '/checkout'],
        pickFolder,
        findYaml,
        readText: async () => '',
      },
      { blueprintsFolderSetting: 'blueprints' }
    );
    expect(pickFolder).toHaveBeenCalledWith(['/billing', '/checkout']);
    expect(findYaml).toHaveBeenCalledWith('/checkout', 'blueprints');
    expect(findYaml).not.toHaveBeenCalledWith('/billing', 'blueprints');
  });

  it('reads nothing when the folder pick is cancelled', async () => {
    const findYaml = vi.fn<WorkspaceFiles['findYaml']>(async () => ['/billing/blueprints/a.yaml']);
    const readText = vi.fn<WorkspaceFiles['readText']>(async () => 'yaml');
    const read = await collectBlueprintFiles(
      {
        workspaceFolders: () => ['/billing', '/checkout'],
        findYaml,
        readText,
        pickFolder: async () => undefined,
      },
      { blueprintsFolderSetting: 'blueprints' }
    );
    expect(read).toEqual({ status: 'cancelled' });
    expect(findYaml).not.toHaveBeenCalled();
    expect(readText).not.toHaveBeenCalled();
  });

  it('uses the folder that contains the invoked file', async () => {
    const pickFolder = vi.fn<WorkspaceFiles['pickFolder']>(async () => '/billing');
    const findYaml = vi.fn<WorkspaceFiles['findYaml']>(async () => []);
    await collectBlueprintFiles(
      {
        workspaceFolders: () => ['/billing', '/checkout'],
        pickFolder,
        findYaml,
        readText: async () => '',
      },
      {
        invokedPath: '/checkout/blueprints/context.yaml',
        blueprintsFolderSetting: 'blueprints',
      }
    );
    expect(pickFolder).not.toHaveBeenCalled();
    expect(findYaml).toHaveBeenCalledWith('/checkout', 'blueprints');
  });

  it('includes an invoked blueprint that sits outside the blueprints folder', async () => {
    const findYaml = vi.fn<WorkspaceFiles['findYaml']>(async () => []);
    const read = await collectBlueprintFiles(
      {
        workspaceFolders: () => ['/repo'],
        findYaml,
        readText: async filePath => `content:${filePath}`,
        pickFolder: async () => undefined,
      },
      { invokedPath: '/repo/docs/extra.yaml', blueprintsFolderSetting: 'blueprints' }
    );
    expect(read).toEqual({
      status: 'ok',
      files: [{ path: '/repo/docs/extra.yaml', content: 'content:/repo/docs/extra.yaml' }],
    });
  });

  it('does not read a file outside the workspace', async () => {
    const readText = vi.fn<WorkspaceFiles['readText']>(async () => 'secret');
    const read = await collectBlueprintFiles(
      {
        workspaceFolders: () => ['/repo'],
        findYaml: async () => ['/etc/passwd.yaml'],
        readText,
        pickFolder: async () => undefined,
      },
      { invokedPath: '/etc/secrets.yaml', blueprintsFolderSetting: 'blueprints' }
    );
    expect(read).toEqual({ status: 'ok', files: [] });
    expect(readText).not.toHaveBeenCalled();
  });

  it('ignores a blueprints folder setting that leaves the workspace', async () => {
    const findYaml = vi.fn<WorkspaceFiles['findYaml']>(async () => []);
    await collectBlueprintFiles(
      {
        workspaceFolders: () => ['/repo'],
        findYaml,
        readText: async () => '',
        pickFolder: async () => undefined,
      },
      { blueprintsFolderSetting: '../../etc' }
    );
    expect(findYaml).toHaveBeenCalledWith('/repo', 'blueprints');
  });

  it('rejects a picked folder that was not offered', async () => {
    const findYaml = vi.fn<WorkspaceFiles['findYaml']>(async () => ['/tmp/other/a.yaml']);
    const read = await collectBlueprintFiles(
      {
        workspaceFolders: () => ['/billing', '/checkout'],
        pickFolder: async () => '/tmp/other',
        findYaml,
        readText: async () => '',
      },
      { blueprintsFolderSetting: 'blueprints' }
    );
    expect(read).toEqual({ status: 'cancelled' });
    expect(findYaml).not.toHaveBeenCalled();
  });
});
