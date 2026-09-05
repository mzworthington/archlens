import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SAMPLES_CONTEXT_PATH } from '../../samplesWorkspace';
import { loadWorkspaceFromDirectory } from './openWorkspaceFromDisk';
import {
  createOpenWorkspaceLogger,
  createOpenWorkspaceWorkingCopy,
  openWorkspaceDiskFilesFixture,
} from './openWorkspace.fixtures';

describe('loadWorkspaceFromDirectory', () => {
  const set = vi.fn();
  const initSchema = vi.fn();
  const logger = createOpenWorkspaceLogger();
  const workingCopy = createOpenWorkspaceWorkingCopy();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the context diagram from filesystem YAML', async () => {
    const ok = await loadWorkspaceFromDirectory({
      selectDirectory: async () => true,
      readDirectoryFiles: async () => openWorkspaceDiskFilesFixture,
      getDirectoryName: () => 'MockWorkspace',
      workingCopy: workingCopy as never,
      logger,
      initSchema,
      set,
      isSampleWorkspace: false,
    });

    expect(ok).toBe(true);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        isWorkspaceOpen: true,
        isSampleWorkspace: false,
        workspaceName: 'MockWorkspace',
        currentFilePath: SAMPLES_CONTEXT_PATH,
        loadedSystems: [
          expect.objectContaining({
            path: SAMPLES_CONTEXT_PATH,
            name: 'Samples',
          }),
        ],
      })
    );
    expect(initSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        entityRef: 'samples',
        level: 'context',
        name: 'Samples',
      })
    );
  });

  it('returns false when the folder picker is denied', async () => {
    const ok = await loadWorkspaceFromDirectory({
      selectDirectory: async () => false,
      readDirectoryFiles: async () => {
        throw new Error('should not read after a denied picker');
      },
      getDirectoryName: () => 'MockWorkspace',
      workingCopy: workingCopy as never,
      logger,
      initSchema,
      set,
    });

    expect(ok).toBe(false);
    expect(set).not.toHaveBeenCalled();
    expect(initSchema).not.toHaveBeenCalled();
  });

  it('throws when the selected folder has no blueprint files', async () => {
    await expect(
      loadWorkspaceFromDirectory({
        selectDirectory: async () => true,
        readDirectoryFiles: async () => [],
        getDirectoryName: () => 'MockWorkspace',
        workingCopy: workingCopy as never,
        logger,
        initSchema,
        set,
      })
    ).rejects.toThrow(/No blueprint \.yaml or \.yml files found/i);
    expect(set).not.toHaveBeenCalled();
  });
});
