import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SAMPLES_CONTEXT_PATH } from '../../samplesWorkspace';
import { loadWorkspaceFromSandbox } from './openWorkspaceFromSandbox';
import {
  createOpenWorkspaceLogger,
  createOpenWorkspaceWorkingCopy,
  openWorkspaceCatalogFixture,
  readOpenWorkspaceFixtureFile,
} from './openWorkspace.fixtures';

describe('loadWorkspaceFromSandbox', () => {
  const set = vi.fn();
  const initSchema = vi.fn();
  const logger = createOpenWorkspaceLogger();
  const workingCopy = createOpenWorkspaceWorkingCopy();
  const onOpened = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the sandbox context diagram from the session catalog', async () => {
    const readFile = vi.fn(readOpenWorkspaceFixtureFile);
    const workspacePort = {
      readFile,
      getDirectoryName: () => 'samples',
    };

    const ok = await loadWorkspaceFromSandbox({
      loadSession: async () => ({
        catalog: openWorkspaceCatalogFixture,
        workspacePort,
      }),
      workingCopy: workingCopy as never,
      logger,
      initSchema,
      set,
      onOpened,
    });

    expect(ok).toBe(true);
    expect(readFile).toHaveBeenCalledTimes(1);
    expect(readFile).toHaveBeenCalledWith(SAMPLES_CONTEXT_PATH);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        isWorkspaceOpen: true,
        isSampleWorkspace: true,
        workspaceName: 'samples',
        workspaceCatalog: openWorkspaceCatalogFixture,
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
    expect(onOpened).toHaveBeenCalledWith(openWorkspaceCatalogFixture);
  });

  it('throws when the sandbox session is denied', async () => {
    await expect(
      loadWorkspaceFromSandbox({
        loadSession: async () => {
          throw new Error('Sandbox catalog denied');
        },
        workingCopy: workingCopy as never,
        logger,
        initSchema,
        set,
        onOpened,
      })
    ).rejects.toThrow(/Sandbox catalog denied/i);
    expect(set).not.toHaveBeenCalled();
    expect(onOpened).not.toHaveBeenCalled();
  });

  it('throws when the sandbox catalog has no diagrams', async () => {
    await expect(
      loadWorkspaceFromSandbox({
        loadSession: async () => ({
          catalog: [],
          workspacePort: {
            readFile: async () => '',
            getDirectoryName: () => 'samples',
          },
        }),
        workingCopy: workingCopy as never,
        logger,
        initSchema,
        set,
        onOpened,
      })
    ).rejects.toThrow(/no diagrams/i);
    expect(set).not.toHaveBeenCalled();
    expect(onOpened).not.toHaveBeenCalled();
  });
});
