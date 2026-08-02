import { parseWorkspaceCatalogJson, type WorkspaceCatalogEntry } from '@archlens/core';
import type { WorkspacePort } from '../../core';
import {
  BUNDLED_WORKSPACE_NAME,
  GOLDEN_PATHS_CONTEXT_PATH,
} from '../../application/store/goldenPathsSample';
import { listBundledPreloadPaths } from '../../application/store/bundledSamplePreload';

/** Cap parallel blueprint downloads so browsers/GitHub Pages don't drop connections. */
export const BUNDLED_BLUEPRINT_FETCH_CONCURRENCY = 24;
/** Keep idle warm gentle so it does not contend with the first user navigation. */
export const BUNDLED_PRELOAD_FETCH_CONCURRENCY = 4;
const FETCH_ATTEMPTS = 3;

function bundledAssetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const assetPath = `${base}bundled-blueprints/${relativePath}`.replace(/(?<!:)\/{2,}/g, '/');
  return new URL(assetPath, window.location.origin).toString();
}

let catalogPromise: Promise<WorkspaceCatalogEntry[]> | null = null;

function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /failed to fetch|networkerror|load failed|network request failed/i.test(error.message);
}

function sandboxFetchError(error: unknown, context: string): Error {
  if (error instanceof Error && isTransientNetworkError(error)) {
    return new Error(
      `Failed to fetch sandbox blueprints (${error.message}). ${context} Check your network connection and retry.`
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchResponseWithRetry(url: string, attempts = FETCH_ATTEMPTS): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (
        response.ok ||
        (response.status >= 400 && response.status < 500 && response.status !== 429)
      ) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    const retryable =
      isTransientNetworkError(lastError) ||
      /HTTP (429|5\d\d)/.test(String(lastError instanceof Error ? lastError.message : lastError));
    if (!retryable || attempt === attempts) break;
    await sleep(50 * attempt);
  }
  throw sandboxFetchError(
    lastError,
    'The demo loads catalog metadata and individual YAML files from /bundled-blueprints/.'
  );
}

async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]!);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

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
        throw sandboxFetchError(
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
 * Failures are ignored — ad-hoc `readFile` remains the source of truth.
 */
export async function warmBundledBlueprintBodies(paths: readonly string[]): Promise<void> {
  if (paths.length === 0) return;
  await mapPool(paths, BUNDLED_PRELOAD_FETCH_CONCURRENCY, async relativePath => {
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
 * Read-only workspace over repo `blueprints/` mirrored to `public/bundled-blueprints/`
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
    const contents = await mapPool(paths, BUNDLED_BLUEPRINT_FETCH_CONCURRENCY, async name =>
      fetchBlueprintContent(name)
    );
    const entries = paths.map((name, index) => ({
      name,
      content: contents[index]!,
    }));
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  },
};

export { GOLDEN_PATHS_CONTEXT_PATH };
