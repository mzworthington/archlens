import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SystemSchema, WorkspaceCatalogEntry } from '@archlens/core';
import { prefetchAllWorkspaceSystems } from './prefetchWorkspaceSystems';
import * as ensureSystemLoadedModule from '../ioState/ensureSystemLoaded';

describe('prefetchAllWorkspaceSystems', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lazy-loads unloaded workspace catalog entries', async () => {
    const ensureSystemLoaded = vi
      .spyOn(ensureSystemLoadedModule, 'ensureSystemLoaded')
      .mockResolvedValue(true);

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
  });

  it('no-ops when workspace is not open', async () => {
    const ensureSystemLoaded = vi
      .spyOn(ensureSystemLoadedModule, 'ensureSystemLoaded')
      .mockResolvedValue(true);

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
          entityRef: 'demo',
          nodeEntityRefs: [],
        },
        {
          path: 'app/containers.yaml',
          name: 'Containers',
          level: 'container',
          entityRef: 'demo/app',
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

    expect(ensureSystemLoaded).not.toHaveBeenCalled();
  });
});
