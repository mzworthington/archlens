/**
 * Demo diagrams to warm after sandbox open (and SW-precache at build).
 * Full catalog peers stay available; non-matching YAML stays fetch-on-demand.
 *
 * Includes ArchLens product context (`blueprint/`) plus golden-journey and the
 * ChaosLens / AdviceLens stress estates. TraceLens demos use golden-journey;
 * there is no separate tracelens-stress tree.
 */
export const BUNDLED_PRELOAD_PREFIXES = [
  'blueprint/',
  'golden-journey/',
  'chaoslens-stress/',
  'advicelens-stress/',
] as const;

export type BundledPreloadCatalogEntry = {
  path: string;
};

/** Catalog paths whose YAML bodies should be prefetched (order preserved, catalog order). */
export function listBundledPreloadPaths(catalog: readonly BundledPreloadCatalogEntry[]): string[] {
  return catalog
    .map(entry => entry.path)
    .filter(path => BUNDLED_PRELOAD_PREFIXES.some(prefix => path.startsWith(prefix)));
}
