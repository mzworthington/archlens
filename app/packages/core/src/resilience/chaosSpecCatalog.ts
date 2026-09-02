import { resolveEntityHome, type WorkspaceCatalogEntry } from '../lib/workspaceCatalog.ts';
import type { ChaosSpecDocument } from './chaosSpecDocument.ts';

/** Lightweight ChaosSpec index row for centralized browsing. */
export type ChaosSpecCatalogEntry = {
  /** Stable id - typically the relative path (e.g. `payment-outage.yaml`). */
  id: string;
  name: string;
  description?: string;
  diagramRef: string;
  faultCount: number;
};

export type ChaosSpecCatalogAvailability = 'available' | 'diagram-missing';

/**
 * Project a parsed ChaosSpec document into a catalog entry.
 * `id` is assigned by the loader (path / key), not by the document body.
 */
export function toChaosSpecCatalogEntry(
  id: string,
  document: Pick<ChaosSpecDocument, 'metadata' | 'faults'>
): ChaosSpecCatalogEntry {
  return {
    id,
    name: document.metadata.name,
    ...(document.metadata.description ? { description: document.metadata.description } : {}),
    diagramRef: document.metadata.diagramRef,
    faultCount: document.faults.length,
  };
}

/** Sort by name, then id - stable for picker lists. */
export function sortChaosSpecCatalogEntries(
  entries: readonly ChaosSpecCatalogEntry[]
): ChaosSpecCatalogEntry[] {
  return [...entries].sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    if (byName !== 0) return byName;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Whether the active workspace can open this scenario (diagramRef resolves).
 */
export function resolveChaosSpecCatalogAvailability(
  entry: Pick<ChaosSpecCatalogEntry, 'diagramRef'>,
  workspaceCatalog: readonly WorkspaceCatalogEntry[]
): ChaosSpecCatalogAvailability {
  return resolveEntityHome(workspaceCatalog, entry.diagramRef) ? 'available' : 'diagram-missing';
}

/**
 * Merge catalog sources by id. Later sources win (e.g. workspace over bundled).
 */
export function mergeChaosSpecCatalogEntries(
  ...sources: Array<readonly ChaosSpecCatalogEntry[]>
): ChaosSpecCatalogEntry[] {
  const byId = new Map<string, ChaosSpecCatalogEntry>();
  for (const source of sources) {
    for (const entry of source) {
      byId.set(entry.id, entry);
    }
  }
  return sortChaosSpecCatalogEntries([...byId.values()]);
}
