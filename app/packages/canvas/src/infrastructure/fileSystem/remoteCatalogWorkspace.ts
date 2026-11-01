import {
  parseRemoteCatalogLatestPointer,
  parseWorkspaceCatalogJson,
  remoteCatalogLatestManifestKey,
  type RemoteCatalogLatestPointer,
  type WorkspaceCatalogEntry,
} from '@archlens/core';
import { createHttpObjectStorage } from '@archlens/storage/http';
import type { WorkspacePort } from '../../core';
import { CATALOG_BLUEPRINT_FETCH_CONCURRENCY, mapPool } from './catalogNetworkFetch';

export type RemoteCatalogWorkspaceOptions = {
  baseUrl: string;
  workspaceName: string;
  fetchImpl?: typeof fetch;
};

type ResolvedRemoteCatalog = {
  snapshotPrefix: string;
  revision: string;
  publishedAt: string;
  catalog: WorkspaceCatalogEntry[];
};

export type RemoteCatalogIdentity = {
  revision: string;
  snapshotPrefix: string;
  publishedAt: string;
};

let resolvedCatalogPromise: Promise<ResolvedRemoteCatalog> | null = null;
let resolvedCatalogBaseUrl: string | null = null;
let loadedIdentity: RemoteCatalogIdentity | null = null;

function resetRemoteCatalogCache(): void {
  resolvedCatalogPromise = null;
  resolvedCatalogBaseUrl = null;
  loadedIdentity = null;
}

/** Drop the cached snapshot so the next catalog read follows `latest` again. */
export function invalidateRemoteCatalogCache(): void {
  resetRemoteCatalogCache();
}

/** Revision currently cached for canvas reads. Null before the first successful load. */
export function getLoadedRemoteCatalogIdentity(): RemoteCatalogIdentity | null {
  return loadedIdentity;
}

/** Read `latest/manifest.json` without replacing the snapshot the canvas is using. */
export async function fetchRemoteCatalogLatestPointer(
  options: RemoteCatalogWorkspaceOptions
): Promise<RemoteCatalogLatestPointer> {
  const baseUrl = options.baseUrl.trim().replace(/\/$/, '');
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${baseUrl}/${remoteCatalogLatestManifestKey()}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for latest catalog pointer`);
  }
  return parseRemoteCatalogLatestPointer(JSON.parse(await response.text()));
}

async function resolveRemoteCatalog(
  options: RemoteCatalogWorkspaceOptions
): Promise<ResolvedRemoteCatalog> {
  const normalizedBase = options.baseUrl.trim();
  if (resolvedCatalogPromise && resolvedCatalogBaseUrl === normalizedBase) {
    return resolvedCatalogPromise;
  }

  resolvedCatalogBaseUrl = normalizedBase;
  resolvedCatalogPromise = (async () => {
    try {
      const storage = createHttpObjectStorage({
        provider: 'http',
        baseUrl: normalizedBase,
        fetchImpl: options.fetchImpl,
      });
      const pointer = parseRemoteCatalogLatestPointer(
        JSON.parse(await storage.getObjectText(remoteCatalogLatestManifestKey()))
      );
      const catalog = parseWorkspaceCatalogJson(
        JSON.parse(await storage.getObjectText(`${pointer.snapshotPrefix}catalog.json`))
      );
      const resolved = {
        snapshotPrefix: pointer.snapshotPrefix,
        revision: pointer.revision,
        publishedAt: pointer.publishedAt,
        catalog,
      };
      loadedIdentity = {
        revision: resolved.revision,
        snapshotPrefix: resolved.snapshotPrefix,
        publishedAt: resolved.publishedAt,
      };
      return resolved;
    } catch (error) {
      resetRemoteCatalogCache();
      throw error instanceof Error ? error : new Error(String(error));
    }
  })();

  return resolvedCatalogPromise;
}

export async function loadRemoteWorkspaceCatalog(
  options: RemoteCatalogWorkspaceOptions
): Promise<WorkspaceCatalogEntry[]> {
  const resolved = await resolveRemoteCatalog(options);
  return resolved.catalog;
}

export function createRemoteCatalogWorkspaceAdapter(
  options: RemoteCatalogWorkspaceOptions
): WorkspacePort {
  async function fetchBlueprintContent(relativePath: string): Promise<string> {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
    const resolved = await resolveRemoteCatalog(options);
    const allowed = new Set(resolved.catalog.map(entry => entry.path));
    if (!allowed.has(normalized)) {
      throw new Error(`Remote catalog does not contain blueprint path: ${normalized}`);
    }

    const storage = createHttpObjectStorage({
      provider: 'http',
      baseUrl: options.baseUrl,
      fetchImpl: options.fetchImpl,
    });
    return storage.getObjectText(`${resolved.snapshotPrefix}${normalized}`);
  }

  return {
    selectDirectory: async () => true,
    readFile: async (relativePath: string): Promise<string> => fetchBlueprintContent(relativePath),
    writeFile: async () => false,
    getDirectoryName: () => options.workspaceName,
    hasPermission: async () => false,
    readDirectoryFiles: async (): Promise<Array<{ name: string; content: string }>> => {
      const catalog = await loadRemoteWorkspaceCatalog(options);
      const paths = catalog.map(entry => entry.path);
      const contents = await mapPool(paths, CATALOG_BLUEPRINT_FETCH_CONCURRENCY, async name =>
        fetchBlueprintContent(name)
      );
      const entries = paths.map((name, index) => ({
        name,
        content: contents[index]!,
      }));
      return entries.sort((a, b) => a.name.localeCompare(b.name));
    },
  };
}
