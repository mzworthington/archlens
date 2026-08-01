import type { WorkspacePort } from '../../core';
import {
  BUNDLED_WORKSPACE_NAME,
  GOLDEN_PATHS_CONTEXT_PATH,
} from '../../application/store/goldenPathsSample';

/** Cap parallel blueprint downloads so browsers/GitHub Pages don't drop connections. */
export const BUNDLED_BLUEPRINT_FETCH_CONCURRENCY = 24;
const FETCH_ATTEMPTS = 3;

function bundledAssetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const assetPath = `${base}bundled-blueprints/${relativePath}`.replace(/(?<!:)\/{2,}/g, '/');
  return new URL(assetPath, window.location.origin).toString();
}

let manifestPromise: Promise<string[]> | null = null;

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
    'The demo loads many static YAML files from /bundled-blueprints/.'
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

async function loadManifest(): Promise<string[]> {
  if (!manifestPromise) {
    manifestPromise = (async () => {
      try {
        const response = await fetchResponseWithRetry(bundledAssetUrl('manifest.json'));
        if (!response.ok) {
          throw new Error(`Failed to load bundled blueprints manifest (${response.status})`);
        }
        const manifest = (await response.json()) as string[];
        if (!Array.isArray(manifest) || manifest.length === 0) {
          throw new Error('Bundled blueprints manifest is empty');
        }
        return manifest;
      } catch (error) {
        manifestPromise = null;
        throw sandboxFetchError(
          error,
          'The demo loads many static YAML files from /bundled-blueprints/.'
        );
      }
    })();
  }
  return manifestPromise;
}

async function fetchBlueprintContent(relativePath: string): Promise<string> {
  const manifest = await loadManifest();
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!manifest.includes(normalized)) {
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
 * Read-only workspace over repo `blueprints/` mirrored to `public/bundled-blueprints/`
 * at build/dev start. Served as static assets (no Vite HMR on YAML imports).
 */
export const BundledSampleWorkspaceAdapter: WorkspacePort = {
  selectDirectory: async () => true,
  readFile: async (relativePath: string): Promise<string> => fetchBlueprintContent(relativePath),
  writeFile: async () => false,
  getDirectoryName: () => BUNDLED_WORKSPACE_NAME,
  hasPermission: async () => false,
  readDirectoryFiles: async (): Promise<Array<{ name: string; content: string }>> => {
    const manifest = await loadManifest();
    const contents = await mapPool(manifest, BUNDLED_BLUEPRINT_FETCH_CONCURRENCY, async name =>
      fetchBlueprintContent(name)
    );
    const entries = manifest.map((name, index) => ({
      name,
      content: contents[index]!,
    }));
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  },
};

export { GOLDEN_PATHS_CONTEXT_PATH };
