import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceCatalogEntry } from '@archlens/core';
import {
  catalogRefreshNextStep,
  remoteCatalogRefreshOffer,
  runRemoteCatalogRefresh,
} from './remoteCatalogRefresh';

const catalog: WorkspaceCatalogEntry[] = [
  {
    path: 'context.yaml',
    name: 'Samples',
    level: 'context',
    entityRef: 'samples',
    nodeEntityRefs: [],
  },
];

describe('remote catalog refresh offer', () => {
  it('stays hidden until a newer revision exists', () => {
    expect(
      remoteCatalogRefreshOffer({
        loadedRevision: 'rev1',
        latestRevision: 'rev1',
        dismissedRevision: null,
      })
    ).toBe('hidden');
    expect(
      remoteCatalogRefreshOffer({
        loadedRevision: null,
        latestRevision: 'rev2',
        dismissedRevision: null,
      })
    ).toBe('hidden');
  });

  it('offers a newer revision and hides it after the user keeps the current snapshot', () => {
    expect(
      remoteCatalogRefreshOffer({
        loadedRevision: 'rev1',
        latestRevision: 'rev2',
        dismissedRevision: null,
      })
    ).toBe('offer');
    expect(
      remoteCatalogRefreshOffer({
        loadedRevision: 'rev1',
        latestRevision: 'rev2',
        dismissedRevision: 'rev2',
      })
    ).toBe('hidden');
  });

  it('asks before refresh when drafts exist', () => {
    expect(catalogRefreshNextStep(false, false)).toBe('refresh');
    expect(catalogRefreshNextStep(true, false)).toBe('needs-confirm');
    expect(catalogRefreshNextStep(true, true)).toBe('refresh');
  });
});

describe('runRemoteCatalogRefresh', () => {
  it('does not load a snapshot when drafts are unconfirmed', async () => {
    const openCatalog = vi.fn();
    const invalidateCache = vi.fn();
    const result = await runRemoteCatalogRefresh({
      hasPendingChanges: true,
      confirmed: false,
      currentFilePath: 'context.yaml',
      clearDrafts: vi.fn(),
      clearSessionLayout: vi.fn(),
      invalidateCache,
      loadSession: vi.fn(),
      readLoadedRevision: () => null,
      openCatalog,
      selectEntryPath: () => 'context.yaml',
    });
    expect(result).toBe('needs-confirm');
    expect(invalidateCache).not.toHaveBeenCalled();
    expect(openCatalog).not.toHaveBeenCalled();
  });

  it('loads the new snapshot on the current diagram after drafts are cleared', async () => {
    const clearDrafts = vi.fn().mockResolvedValue(undefined);
    const clearSessionLayout = vi.fn();
    const openCatalog = vi.fn().mockResolvedValue(true);

    const result = await runRemoteCatalogRefresh({
      hasPendingChanges: true,
      confirmed: true,
      currentFilePath: 'context.yaml',
      clearDrafts,
      clearSessionLayout,
      invalidateCache: vi.fn(),
      loadSession: vi.fn().mockResolvedValue({
        catalog,
        workspacePort: {} as never,
        usesRemoteCatalog: true,
      }),
      readLoadedRevision: () => 'rev2',
      openCatalog,
      selectEntryPath: () => 'other.yaml',
    });

    expect(result).toBe('refreshed');
    expect(clearDrafts).toHaveBeenCalledOnce();
    expect(clearSessionLayout).toHaveBeenCalledOnce();
    expect(openCatalog).toHaveBeenCalledWith(expect.anything(), 'context.yaml');
  });

  it('keeps the canvas when the remote catalog falls back to bundled files', async () => {
    const openCatalog = vi.fn();
    const result = await runRemoteCatalogRefresh({
      hasPendingChanges: false,
      confirmed: false,
      currentFilePath: 'context.yaml',
      clearDrafts: vi.fn(),
      clearSessionLayout: vi.fn(),
      invalidateCache: vi.fn(),
      loadSession: vi.fn().mockResolvedValue({
        catalog,
        workspacePort: {} as never,
        usesRemoteCatalog: false,
      }),
      readLoadedRevision: () => null,
      openCatalog,
      selectEntryPath: () => 'context.yaml',
    });
    expect(result).toBe('failed');
    expect(openCatalog).not.toHaveBeenCalled();
  });
});
