import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GOLDEN_JOURNEY_CONTAINERS_PATH } from '../../samplesWorkspace';
import { loadWorkspaceFromCatalog } from './openWorkspaceFromCatalog';
import {
  OPEN_WORKSPACE_CONTAINERS_YAML,
  createOpenWorkspaceLogger,
  createOpenWorkspaceWorkingCopy,
  openWorkspaceCatalogFixture,
  readOpenWorkspaceFixtureFile,
} from './openWorkspace.fixtures';

describe('loadWorkspaceFromCatalog', () => {
  const set = vi.fn();
  const initSchema = vi.fn();
  const logger = createOpenWorkspaceLogger();
  const workingCopy = createOpenWorkspaceWorkingCopy();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads only the entry YAML and installs the prebuilt catalog', async () => {
    const readFile = vi.fn(readOpenWorkspaceFixtureFile);

    const ok = await loadWorkspaceFromCatalog({
      catalog: openWorkspaceCatalogFixture,
      entryPath: GOLDEN_JOURNEY_CONTAINERS_PATH,
      readFile,
      getDirectoryName: () => 'samples',
      workingCopy: workingCopy as never,
      logger,
      initSchema,
      set,
      isSampleWorkspace: true,
    });

    expect(ok).toBe(true);
    expect(readFile).toHaveBeenCalledTimes(1);
    expect(readFile).toHaveBeenCalledWith(GOLDEN_JOURNEY_CONTAINERS_PATH);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        isWorkspaceOpen: true,
        isSampleWorkspace: true,
        workspaceName: 'samples',
        workspaceCatalog: openWorkspaceCatalogFixture,
        currentFilePath: GOLDEN_JOURNEY_CONTAINERS_PATH,
        loadedSystems: [
          expect.objectContaining({
            path: GOLDEN_JOURNEY_CONTAINERS_PATH,
            name: 'Golden Journey Estate',
          }),
        ],
      })
    );
    expect(initSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        entityRef: 'samples/golden-journey',
        level: 'container',
      })
    );
  });

  it('throws when the entry path is missing from the catalog', async () => {
    await expect(
      loadWorkspaceFromCatalog({
        catalog: openWorkspaceCatalogFixture,
        entryPath: 'missing.yaml',
        readFile: async () => OPEN_WORKSPACE_CONTAINERS_YAML,
        getDirectoryName: () => 'samples',
        workingCopy: workingCopy as never,
        logger,
        initSchema,
        set,
      })
    ).rejects.toThrow(/missing.yaml/i);
    expect(set).not.toHaveBeenCalled();
  });

  it('throws when the entry file cannot be read', async () => {
    await expect(
      loadWorkspaceFromCatalog({
        catalog: openWorkspaceCatalogFixture,
        entryPath: GOLDEN_JOURNEY_CONTAINERS_PATH,
        readFile: async () => {
          throw new Error('File not found: golden-journey/containers.yaml');
        },
        getDirectoryName: () => 'samples',
        workingCopy: workingCopy as never,
        logger,
        initSchema,
        set,
      })
    ).rejects.toThrow(/File not found/i);
    expect(set).not.toHaveBeenCalled();
  });
});
