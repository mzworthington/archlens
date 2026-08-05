import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCatalogEntry } from '@archlens/core';

const catalog: WorkspaceCatalogEntry[] = [
  {
    path: 'blueprint/context.yaml',
    entityRef: 'blueprint/context',
    name: 'Context',
    level: 'context',
    nodeEntityRefs: [],
  },
];

describe('loadSampleWorkspaceSession', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('createSampleWorkspacePort uses bundled adapter when remote env is unset', async () => {
    vi.stubEnv('VITE_REMOTE_CATALOG_BASE_URL', '');
    const bundled = await import('./bundledSampleWorkspace');
    const { createSampleWorkspacePort } = await import('./sampleWorkspaceLoader');
    expect(createSampleWorkspacePort()).toBe(bundled.BundledSampleWorkspaceAdapter);
  });

  it('createSampleWorkspacePort prefers remote adapter when env is set', async () => {
    vi.stubEnv('VITE_REMOTE_CATALOG_BASE_URL', 'https://blueprints.example.test/');
    const remote = await import('./remoteCatalogWorkspace');
    const createRemote = vi
      .spyOn(remote, 'createRemoteCatalogWorkspaceAdapter')
      .mockReturnValue({ readFile: vi.fn() } as never);
    const { createSampleWorkspacePort } = await import('./sampleWorkspaceLoader');
    createSampleWorkspacePort();
    expect(createRemote).toHaveBeenCalledWith({
      baseUrl: 'https://blueprints.example.test/',
      workspaceName: 'samples',
    });
  });

  it('uses bundled catalog when remote env is unset', async () => {
    vi.stubEnv('VITE_REMOTE_CATALOG_BASE_URL', '');
    const bundled = await import('./bundledSampleWorkspace');
    vi.spyOn(bundled, 'loadBundledWorkspaceCatalog').mockResolvedValue(catalog);

    const { loadSampleWorkspaceSession } = await import('./sampleWorkspaceLoader');
    const session = await loadSampleWorkspaceSession();

    expect(session.usesRemoteCatalog).toBe(false);
    expect(session.catalog).toEqual(catalog);
    expect(session.workspacePort).toBe(bundled.BundledSampleWorkspaceAdapter);
  });

  it('falls back to bundled catalog when remote manifest is unavailable', async () => {
    vi.stubEnv('VITE_REMOTE_CATALOG_BASE_URL', 'https://blueprints.example.test/');
    const remote = await import('./remoteCatalogWorkspace');
    const bundled = await import('./bundledSampleWorkspace');
    vi.spyOn(remote, 'loadRemoteWorkspaceCatalog').mockRejectedValue(new Error('HTTP 404'));
    vi.spyOn(bundled, 'loadBundledWorkspaceCatalog').mockResolvedValue(catalog);

    const { loadSampleWorkspaceSession } = await import('./sampleWorkspaceLoader');
    const session = await loadSampleWorkspaceSession();

    expect(session.usesRemoteCatalog).toBe(false);
    expect(session.catalog).toEqual(catalog);
    expect(session.workspacePort).toBe(bundled.BundledSampleWorkspaceAdapter);
  });

  it('uses remote catalog when manifest resolves', async () => {
    vi.stubEnv('VITE_REMOTE_CATALOG_BASE_URL', 'https://blueprints.example.test/');
    const remote = await import('./remoteCatalogWorkspace');
    vi.spyOn(remote, 'loadRemoteWorkspaceCatalog').mockResolvedValue(catalog);
    const createRemote = vi
      .spyOn(remote, 'createRemoteCatalogWorkspaceAdapter')
      .mockReturnValue({ readFile: vi.fn() } as never);

    const { loadSampleWorkspaceSession } = await import('./sampleWorkspaceLoader');
    const session = await loadSampleWorkspaceSession();

    expect(session.usesRemoteCatalog).toBe(true);
    expect(session.catalog).toEqual(catalog);
    expect(createRemote).toHaveBeenCalledWith({
      baseUrl: 'https://blueprints.example.test/',
      workspaceName: 'samples',
    });
  });
});
