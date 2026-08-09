import { parseWorkspaceCatalogJson, type WorkspaceCatalogEntry } from '@archlens/core';
import type { WorkspacePort } from '../../core';
import {
  BUNDLED_WORKSPACE_NAME,
  SAMPLES_CONTEXT_PATH,
} from '../../application/store/samplesWorkspace';
import { listBundledPreloadPaths } from '../../application/store/bundledSamplePreload';
import {
  CATALOG_BLUEPRINT_FETCH_CONCURRENCY,
  CATALOG_PRELOAD_FETCH_CONCURRENCY,
  catalogFetchError,
  fetchResponseWithRetry,
  mapPool,
} from './catalogNetworkFetch';

export {
  CATALOG_BLUEPRINT_FETCH_CONCURRENCY,
  CATALOG_PRELOAD_FETCH_CONCURRENCY,
} from './catalogNetworkFetch';

function bundledAssetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const assetPath = `${base}bundled-blueprints/${relativePath}`.replace(/(?<!:)\/{2,}/g, '/');
  return new URL(assetPath, window.location.origin).toString();
}

let catalogPromise: Promise<WorkspaceCatalogEntry[]> | null = null;

/** Fetch and cache the prebuilt navigation catalog for the bundled demo workspace. */
export async function loadBundledWorkspaceCatalog(): Promise<WorkspaceCatalogEntry[]> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      try {
        const response = await fetchResponseWithRetry(bundledAssetUrl('catalog.json'));
        if (!response.ok) {
          throw new Error(`Failed to load bundled blueprints catalog (${response.status})`);
        }
        return parseWorkspaceCatalogJson(await response.json());
      } catch (error) {
        catalogPromise = null;
        throw catalogFetchError(
          error,
          'The demo loads catalog metadata and individual YAML files from /bundled-blueprints/.'
        );
      }
    })();
  }
  return catalogPromise;
}

async function allowedBlueprintPaths(): Promise<Set<string>> {
  const catalog = await loadBundledWorkspaceCatalog();
  return new Set(catalog.map(entry => entry.path));
}

async function fetchBlueprintContent(relativePath: string): Promise<string> {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
  const allowed = await allowedBlueprintPaths();
  if (!allowed.has(normalized)) {
    throw new Error(
      `Bundled workspace only contains blueprint YAML files (missing: ${normalized})`
    );
  }

  const response = await fetchResponseWithRetry(bundledAssetUrl(normalized));
  if (!response.ok) {
    throw new Error(`Bundled blueprint not found: ${normalized} (${response.status})`);
  }
  return response.text();
}

/**
 * Prefetch demo YAML bodies into HTTP/SW CacheFirst without parsing them.
 * Failures are ignored - ad-hoc `readFile` remains the source of truth.
 */
export async function warmBundledBlueprintBodies(paths: readonly string[]): Promise<void> {
  if (paths.length === 0) return;
  await mapPool(paths, CATALOG_PRELOAD_FETCH_CONCURRENCY, async relativePath => {
    try {
      await fetchResponseWithRetry(bundledAssetUrl(relativePath));
    } catch {
      // Best-effort warm; open/navigation fetch will surface real errors.
    }
  });
}

/** After sandbox open: idle-warm golden + stress YAML; rest of catalog stays on demand. */
export function scheduleBundledBlueprintPreload(catalog: readonly WorkspaceCatalogEntry[]): void {
  const paths = listBundledPreloadPaths(catalog);
  if (paths.length === 0) return;

  const run = () => {
    void warmBundledBlueprintBodies(paths);
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 2_000 });
    return;
  }
  setTimeout(run, 0);
}

/**
 * Read-only workspace over repo `samples/` mirrored to `public/bundled-blueprints/`
 * at build/dev start. Navigation uses prebuilt `catalog.json`; YAML is fetched on demand.
 */
export const BundledSampleWorkspaceAdapter: WorkspacePort = {
  selectDirectory: async () => true,
  readFile: async (relativePath: string): Promise<string> => fetchBlueprintContent(relativePath),
  writeFile: async () => false,
  getDirectoryName: () => BUNDLED_WORKSPACE_NAME,
  hasPermission: async () => false,
  readDirectoryFiles: async (): Promise<Array<{ name: string; content: string }>> => {
    const catalog = await loadBundledWorkspaceCatalog();
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

export { SAMPLES_CONTEXT_PATH };
