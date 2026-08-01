import type { WorkspacePort } from '../../core';
import {
  BUNDLED_WORKSPACE_NAME,
  GOLDEN_PATHS_CONTEXT_PATH,
} from '../../application/store/goldenPathsSample';

function bundledAssetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const assetPath = `${base}bundled-blueprints/${relativePath}`.replace(/(?<!:)\/{2,}/g, '/');
  return new URL(assetPath, window.location.origin).toString();
}

let manifestPromise: Promise<string[]> | null = null;

async function loadManifest(): Promise<string[]> {
  if (!manifestPromise) {
    manifestPromise = fetch(bundledAssetUrl('manifest.json')).then(async response => {
      if (!response.ok) {
        throw new Error(`Failed to load bundled blueprints manifest (${response.status})`);
      }
      const manifest = (await response.json()) as string[];
      if (!Array.isArray(manifest) || manifest.length === 0) {
        throw new Error('Bundled blueprints manifest is empty');
      }
      return manifest;
    });
  }
  return manifestPromise;
}

async function fetchBlueprintContent(relativePath: string): Promise<string> {
  const response = await fetch(bundledAssetUrl(relativePath));
  if (!response.ok) {
    throw new Error(`Bundled blueprint not found: ${relativePath} (${response.status})`);
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
    const entries = await Promise.all(
      manifest.map(async name => ({
        name,
        content: await fetchBlueprintContent(name),
      }))
    );
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  },
};

export { GOLDEN_PATHS_CONTEXT_PATH };
