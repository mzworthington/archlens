import { EntityRef } from '../models/entityIdentity';
import type { SystemNode } from '../models/schema';

/** Persisted hint: whether `name` was curated or derived from entityRef. */
export const DISPLAY_NAME_SOURCE_PROPERTY = 'displayNameSource';
export const DISPLAY_NAME_SOURCE_EXPLICIT = 'explicit';
export const DISPLAY_NAME_SOURCE_DERIVED = 'derived';

export type DisplayNameSource =
  typeof DISPLAY_NAME_SOURCE_EXPLICIT | typeof DISPLAY_NAME_SOURCE_DERIVED;

/**
 * Derive a human label from an entityRef leaf
 * (`acme/checkout` → `Checkout`, `blueprint-catalog-r2` → `Blueprint Catalog R2`).
 */
export function displayNameFromEntityRef(entityRef: string): string {
  const leaf = EntityRef.leaf(entityRef) || entityRef.trim();
  if (!leaf) return entityRef;
  return leaf
    .split('-')
    .filter(Boolean)
    .map(part => {
      // Keep short tokens with digits readable as acronyms (`r2` → `R2`).
      if (/\d/.test(part) && part.length <= 4) return part.toUpperCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

/** Use an explicit name when present; otherwise derive from entityRef. */
export function resolveDisplayName(name: string | undefined | null, entityRef: string): string {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (trimmed) return trimmed;
  return displayNameFromEntityRef(entityRef);
}

export function displayNameSourceForDeclaration(
  name: string | undefined | null
): DisplayNameSource {
  return typeof name === 'string' && name.trim()
    ? DISPLAY_NAME_SOURCE_EXPLICIT
    : DISPLAY_NAME_SOURCE_DERIVED;
}

function inferredDisplayNameSource(
  name: string | undefined | null,
  entityRef: string
): DisplayNameSource {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return DISPLAY_NAME_SOURCE_DERIVED;
  return trimmed === displayNameFromEntityRef(entityRef)
    ? DISPLAY_NAME_SOURCE_DERIVED
    : DISPLAY_NAME_SOURCE_EXPLICIT;
}

export function resolveNodeDisplayNameSource(
  node: Pick<SystemNode, 'name' | 'entityRef' | 'properties'>
): DisplayNameSource {
  const stamped = node.properties?.[DISPLAY_NAME_SOURCE_PROPERTY];
  if (stamped === DISPLAY_NAME_SOURCE_EXPLICIT || stamped === DISPLAY_NAME_SOURCE_DERIVED) {
    return stamped;
  }
  return inferredDisplayNameSource(node.name, node.entityRef);
}

/**
 * Prefer an explicit (curated) display name over a derived/empty one.
 * When both are explicit and differ, keep the existing name for multi-repo stability.
 */
export function preferDisplayName(
  existingName: string | undefined | null,
  incomingName: string | undefined | null,
  entityRef: string,
  sources?: {
    existingSource?: DisplayNameSource;
    incomingSource?: DisplayNameSource;
  }
): string {
  const existingSource =
    sources?.existingSource ?? inferredDisplayNameSource(existingName, entityRef);
  const incomingSource =
    sources?.incomingSource ?? inferredDisplayNameSource(incomingName, entityRef);

  if (
    existingSource === DISPLAY_NAME_SOURCE_EXPLICIT &&
    incomingSource !== DISPLAY_NAME_SOURCE_EXPLICIT
  ) {
    return String(existingName).trim();
  }
  if (
    incomingSource === DISPLAY_NAME_SOURCE_EXPLICIT &&
    existingSource !== DISPLAY_NAME_SOURCE_EXPLICIT
  ) {
    return String(incomingName).trim();
  }
  if (
    existingSource === DISPLAY_NAME_SOURCE_EXPLICIT &&
    incomingSource === DISPLAY_NAME_SOURCE_EXPLICIT
  ) {
    return String(existingName).trim();
  }
  return resolveDisplayName(existingName || incomingName, entityRef);
}

/** Node-aware preference using `displayNameSource` stamps when present. */
export function preferNodeDisplayName(existing: SystemNode, incoming: SystemNode): string {
  return preferDisplayName(existing.name, incoming.name, existing.entityRef, {
    existingSource: resolveNodeDisplayNameSource(existing),
    incomingSource: resolveNodeDisplayNameSource(incoming),
  });
}
