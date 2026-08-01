import type { WorkspaceCatalogEntry } from '@archlens/core';

/** Bundled demo workspace — full repo `blueprints/` tree baked into the production build. */
export const BUNDLED_WORKSPACE_NAME = 'blueprints';
/** Default landing diagram when opening the bundled demo. */
export const GOLDEN_PATHS_CONTEXT_PATH = 'golden-journey/context.yaml';
export const GOLDEN_PATHS_ENTITY_REF = 'golden-paths';
/** Estate container diagram used by demos, tours, and forensics e2e. */
export const GOLDEN_JOURNEY_ENTITY_REF = 'golden-paths/golden-journey';
export const GOLDEN_JOURNEY_CONTAINERS_PATH = 'golden-journey/containers.yaml';

/** Prefer the golden-journey estate diagram, then context, then any catalog entry. */
export function selectBundledSampleEntryPath(catalog: readonly WorkspaceCatalogEntry[]): string {
  if (catalog.length === 0) {
    throw new Error('Bundled catalog has no diagrams');
  }
  const preferred = [GOLDEN_JOURNEY_CONTAINERS_PATH, GOLDEN_PATHS_CONTEXT_PATH];
  for (const path of preferred) {
    if (catalog.some(entry => entry.path === path)) return path;
  }
  const context = catalog.find(entry => entry.level === 'context');
  if (context) return context.path;
  const container = catalog.find(entry => entry.level === 'container');
  if (container) return container.path;
  return catalog[0]!.path;
}
