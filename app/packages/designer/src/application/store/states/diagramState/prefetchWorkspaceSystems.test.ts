import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SystemSchema, WorkspaceCatalogEntry } from '@archlens/core';
import { prefetchAllWorkspaceSystems } from './prefetchWorkspaceSystems';
import * as bundledLoader from './bundledBlueprintLoader';
import * as ensureSystemLoadedModule from '../ioState/ensureSystemLoaded';

describe('prefetchAllWorkspaceSystems', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lazy-loads unloaded workspace catalog entries', async () => {
    const ensureSystemLoaded = vi
      .spyOn(ensureSystemLoadedModule, 'ensureSystemLoaded')
      .mockResolvedValue(true);
    vi.spyOn(bundledLoader, 'startBundledBlueprintPrefetch').mockImplementation(() => {});

    const entrySchema: SystemSchema = {
      name: 'Entry',
      version: '1.0.0',
      level: 'component',
      nodes: [],
      dependencies: [],
    };

    const state = {
      loadedSystems: [{ path: 'entry.yaml', name: 'Entry', schema: entrySchema }],
      workspaceCatalog: [
        {
          path: 'context.yaml',
          name: 'Context',
          level: 'context',
          entityRef: 'demo',
          nodeEntityRefs: [],
        },
        {
          path: 'entry.yaml',
          name: 'Entry',
          level: 'component',
          entityRef: 'demo/entry',
          nodeEntityRefs: [],
        },
      ] satisfies WorkspaceCatalogEntry[],
      workspaceName: 'demo',
      isWorkspaceOpen: true,
      workspacePort: {} as never,
      workingCopyPort: {} as never,
      logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
      nodeRefMap: {},
      diagramLoadCount: 0,
      isLoading: false,
    };

    const set = vi.fn();
    await prefetchAllWorkspaceSystems(() => state, set);

    expect(ensureSystemLoaded).toHaveBeenCalledTimes(1);
    expect(ensureSystemLoaded).toHaveBeenCalledWith('context.yaml', expect.any(Object));
    expect(bundledLoader.startBundledBlueprintPrefetch).not.toHaveBeenCalled();
  });

  it('starts bundled prefetch when sandbox still has unloaded catalog entries', async () => {
    const startPrefetch = vi
      .spyOn(bundledLoader, 'startBundledBlueprintPrefetch')
      .mockImplementation(() => {});
    vi.spyOn(bundledLoader, 'ensureBundledSystemLoaded').mockResolvedValue(true);

    const schema: SystemSchema = {
      name: 'Context',
      version: '1.0.0',
      level: 'context',
      nodes: [],
      dependencies: [],
    };

    const state = {
      loadedSystems: [{ path: 'context.yaml', name: 'Context', schema }],
      workspaceCatalog: [
        {
          path: 'context.yaml',
          name: 'Context',
          level: 'context',
          entityRef: 'blueprint',
          nodeEntityRefs: [],
        },
        {
          path: 'app/containers.yaml',
          name: 'Containers',
          level: 'container',
          entityRef: 'blueprint/app',
          nodeEntityRefs: [],
        },
      ] satisfies WorkspaceCatalogEntry[],
      workspaceName: '',
      isWorkspaceOpen: false,
      workspacePort: {} as never,
      workingCopyPort: {} as never,
      logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
      nodeRefMap: {},
      diagramLoadCount: 0,
      isLoading: false,
    };

    await prefetchAllWorkspaceSystems(() => state, vi.fn());

    expect(startPrefetch).toHaveBeenCalledTimes(1);
    expect(bundledLoader.ensureBundledSystemLoaded).not.toHaveBeenCalled();
  });

  it('starts bundled prefetch when sandbox catalog is already complete', async () => {
    const startPrefetch = vi
      .spyOn(bundledLoader, 'startBundledBlueprintPrefetch')
      .mockImplementation(() => {});
    vi.spyOn(ensureSystemLoadedModule, 'ensureSystemLoaded').mockResolvedValue(true);

    const schema: SystemSchema = {
      name: 'Context',
      version: '1.0.0',
      level: 'context',
      nodes: [],
      dependencies: [],
    };

    const state = {
      loadedSystems: [{ path: 'context.yaml', name: 'Context', schema }],
      workspaceCatalog: [
        {
          path: 'context.yaml',
          name: 'Context',
          level: 'context',
          entityRef: 'blueprint',
          nodeEntityRefs: [],
        },
      ] satisfies WorkspaceCatalogEntry[],
      workspaceName: '',
      isWorkspaceOpen: false,
      workspacePort: {} as never,
      workingCopyPort: {} as never,
      logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
      nodeRefMap: {},
      diagramLoadCount: 0,
      isLoading: false,
    };

    await prefetchAllWorkspaceSystems(() => state, vi.fn());

    expect(startPrefetch).toHaveBeenCalledTimes(1);
  });
});
