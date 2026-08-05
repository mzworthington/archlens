import type { WorkspaceCatalogEntry } from '@archlens/core';
import type { WorkspacePort } from '../../core';
import { BUNDLED_WORKSPACE_NAME } from '../../application/store/samplesWorkspace';
import {
  BundledSampleWorkspaceAdapter,
  loadBundledWorkspaceCatalog,
} from './bundledSampleWorkspace';
import {
  createRemoteCatalogWorkspaceAdapter,
  loadRemoteWorkspaceCatalog,
} from './remoteCatalogWorkspace';

export type SampleWorkspaceSession = {
  catalog: WorkspaceCatalogEntry[];
  workspacePort: WorkspacePort;
  usesRemoteCatalog: boolean;
};

export function resolveRemoteCatalogBaseUrl(): string | undefined {
  const value = import.meta.env.VITE_REMOTE_CATALOG_BASE_URL?.trim();
  return value || undefined;
}

/** Sync port for composition root — prefers remote when env is set (no network probe). */
export function createSampleWorkspacePort(
  remoteBaseUrl: string | undefined = resolveRemoteCatalogBaseUrl()
): WorkspacePort {
  if (!remoteBaseUrl) return BundledSampleWorkspaceAdapter;
  return createRemoteCatalogWorkspaceAdapter({
    baseUrl: remoteBaseUrl,
    workspaceName: BUNDLED_WORKSPACE_NAME,
  });
}

/** Load sandbox catalog + adapter; fall back to bundled assets when remote is unavailable. */
export async function loadSampleWorkspaceSession(): Promise<SampleWorkspaceSession> {
  const remoteBaseUrl = resolveRemoteCatalogBaseUrl();
  if (!remoteBaseUrl) {
    return {
      catalog: await loadBundledWorkspaceCatalog(),
      workspacePort: BundledSampleWorkspaceAdapter,
      usesRemoteCatalog: false,
    };
  }

  const remoteOptions = {
    baseUrl: remoteBaseUrl,
    workspaceName: BUNDLED_WORKSPACE_NAME,
  };

  try {
    const catalog = await loadRemoteWorkspaceCatalog(remoteOptions);
    return {
      catalog,
      workspacePort: createRemoteCatalogWorkspaceAdapter(remoteOptions),
      usesRemoteCatalog: true,
    };
  } catch {
    return {
      catalog: await loadBundledWorkspaceCatalog(),
      workspacePort: BundledSampleWorkspaceAdapter,
      usesRemoteCatalog: false,
    };
  }
}
