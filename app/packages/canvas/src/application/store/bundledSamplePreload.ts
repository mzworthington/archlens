/**
 * Demo diagrams to warm after sandbox open (and SW-precache at build).
 * Full scanned sample corpora are remote-only; bundled fallback is samples.
 */
export const BUNDLED_PRELOAD_PREFIXES = [
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
