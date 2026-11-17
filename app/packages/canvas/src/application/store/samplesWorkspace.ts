import type { WorkspaceCatalogEntry } from '@archlens/core';

/**
 * Bundled demo workspace - committed `samples/` is mirrored for offline / PR fallback.
 * Full scanned sample corpora live in the remote catalog (CI publish), not in git.
 */
export const BUNDLED_WORKSPACE_NAME = 'samples';
/** Default landing diagram when opening the sandbox (remote catalog or bundled). */
export const SAMPLES_CONTEXT_PATH = 'archlens/context.yaml';
/** Offline / PR fallback when the ArchLens scan corpus is not in the catalog. */
export const GOLDEN_JOURNEY_CONTEXT_PATH = 'golden-journey/context.yaml';
export const SAMPLES_ENTITY_REF = 'archlens';
/** Estate container diagram used by demos, tours and forensics e2e. */
export const GOLDEN_JOURNEY_ENTITY_REF = 'samples/golden-journey';
export const GOLDEN_JOURNEY_CONTAINERS_PATH = 'golden-journey/containers.yaml';

/**
 * Prefer ArchLens as the sandbox default. Golden-journey and the rest of the
 * samples estate stay in the catalog for Explorer navigation; they are only
 * used here when ArchLens is missing (offline bundled fallback).
 */
export function selectBundledSampleEntryPath(catalog: readonly WorkspaceCatalogEntry[]): string {
  if (catalog.length === 0) {
    throw new Error('Bundled catalog has no diagrams');
  }
  const preferred = [
    SAMPLES_CONTEXT_PATH,
    GOLDEN_JOURNEY_CONTEXT_PATH,
    GOLDEN_JOURNEY_CONTAINERS_PATH,
  ];
  for (const path of preferred) {
    if (catalog.some(entry => entry.path === path)) return path;
  }
  const context = catalog.find(entry => entry.level === 'context');
  if (context) return context.path;
  const container = catalog.find(entry => entry.level === 'container');
  if (container) return container.path;
  return catalog[0]!.path;
}

function catalogHasArchLens(catalog: readonly WorkspaceCatalogEntry[]): boolean {
  return catalog.some(
    entry => entry.entityRef === SAMPLES_ENTITY_REF || entry.path === SAMPLES_CONTEXT_PATH
  );
}

/**
 * EntityRef for Try the demo / sample-mode landing after the sandbox catalog is open.
 * Prefer ArchLens when the catalog includes it; otherwise use the opened diagram
 * (bundled golden-journey / remote fixtures → typically `samples`).
 */
export function resolveDemoLandingEntityRef(
  catalog: readonly WorkspaceCatalogEntry[],
  openedEntityRef?: string | null
): string {
  if (catalogHasArchLens(catalog)) return SAMPLES_ENTITY_REF;
  if (openedEntityRef) return openedEntityRef;
  if (catalog.some(entry => entry.entityRef === 'samples')) return 'samples';
  return GOLDEN_JOURNEY_ENTITY_REF;
}
