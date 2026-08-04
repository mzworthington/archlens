import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCatalogEntry } from '@archlens/core';
import { loadWorkspaceFromCatalog } from './openWorkspace';
import { GOLDEN_JOURNEY_CONTAINERS_PATH } from '../../samplesWorkspace';

const v4 = 'https://archlens.dev/schemas/v4/blueprint.schema.json';

const catalog: WorkspaceCatalogEntry[] = [
  {
    path: 'advicelens-stress/context.yaml',
    name: 'AdviceLens Stress',
    level: 'context',
    entityRef: 'advicelens-stress',
    nodeEntityRefs: [],
  },
  {
    path: 'golden-journey/context.yaml',
    name: 'Samples',
    level: 'context',
    entityRef: 'samples',
    nodeEntityRefs: ['samples/golden-journey'],
  },
  {
    path: GOLDEN_JOURNEY_CONTAINERS_PATH,
    name: 'Golden Journey Estate',
    level: 'container',
    entityRef: 'samples/golden-journey',
    nodeEntityRefs: ['samples/golden-journey/web'],
    parentEntityRef: 'samples',
  },
  {
    path: 'other/containers.yaml',
    name: 'Other',
    level: 'container',
    entityRef: 'other',
    nodeEntityRefs: [],
  },
];

const entryYaml = `
version: ${v4}
level: container
metadata:
  entityRef: samples/golden-journey
  name: Golden Journey Estate
nodes:
  - entityRef: samples/golden-journey/web
    type: web-app
    name: Web
dependencies: []
`;

describe('loadWorkspaceFromCatalog', () => {
  const set = vi.fn();
  const initSchema = vi.fn();
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const workingCopy = {
    saveBaselineSchema: vi.fn(async () => {}),
    saveWorkingSchema: vi.fn(async () => {}),
    loadWorkingSchema: vi.fn(async () => null),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads only the entry YAML and installs the prebuilt catalog', async () => {
    const readFile = vi.fn(async (path: string) => {
      if (path === GOLDEN_JOURNEY_CONTAINERS_PATH) return entryYaml;
      throw new Error(`unexpected read: ${path}`);
    });

    const ok = await loadWorkspaceFromCatalog({
      catalog,
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
        workspaceCatalog: catalog,
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
        catalog,
        entryPath: 'missing.yaml',
        readFile: async () => entryYaml,
        getDirectoryName: () => 'samples',
        workingCopy: workingCopy as never,
        logger,
        initSchema,
        set,
      })
    ).rejects.toThrow(/missing.yaml/i);
    expect(set).not.toHaveBeenCalled();
  });
});
