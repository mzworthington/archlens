import { EntityRef } from '@archlens/core';
import type { C4Level, WorkspaceCatalogEntry } from '@archlens/core';
import { type LoadedSystemRef, type RankedOffender } from './rankOffenders';

export type TraceLensScopeOption = {
  entityRef: string;
  name: string;
  level: C4Level;
  depth: number;
  offenderCount: number;
};

function isStructuralLevel(level: C4Level): boolean {
  return level === 'context' || level === 'container';
}

function addPrefixScopes(
  matched: Set<string>,
  entityRef: string,
  candidateRefs: Set<string>
): void {
  const parts = entityRef.split('/').filter(Boolean);
  for (let i = 1; i <= parts.length; i++) {
    const prefix = parts.slice(0, i).join('/');
    if (candidateRefs.has(prefix)) matched.add(prefix);
  }
}

function findContainerId(
  systems: readonly LoadedSystemRef[],
  offenderEntityRef: string
): string | undefined {
  for (const system of systems) {
    const node = system.schema.nodes.find(candidate => candidate.entityRef === offenderEntityRef);
    if (node && typeof node.properties?.containerId === 'string') {
      return node.properties.containerId;
    }
  }
  return undefined;
}

function indexOffenderCountsByScope(
  systems: readonly LoadedSystemRef[],
  rankedOffenders: readonly RankedOffender[],
  candidateRefs: Set<string>
): Map<string, number> {
  const counts = new Map<string, number>();
  const containerLeafToScope = new Map<string, string[]>();

  for (const system of systems) {
    if (system.schema.level !== 'container' && system.schema.level !== 'context') continue;
    for (const node of system.schema.nodes) {
      if (!node.entityRef || node.external || node.type !== 'container') continue;
      const leaf = EntityRef.leaf(node.entityRef);
      const scopes = containerLeafToScope.get(leaf) ?? [];
      scopes.push(node.entityRef);
      containerLeafToScope.set(leaf, scopes);
    }
  }

  for (const offender of rankedOffenders) {
    const matched = new Set<string>();
    addPrefixScopes(matched, offender.entityRef, candidateRefs);
    addPrefixScopes(matched, offender.diagramEntityRef, candidateRefs);

    const containerId = findContainerId(systems, offender.entityRef);
    if (typeof containerId === 'string') {
      for (const scopeRef of containerLeafToScope.get(containerId) ?? []) {
        if (candidateRefs.has(scopeRef)) matched.add(scopeRef);
      }
    }

    for (const scopeRef of matched) {
      counts.set(scopeRef, (counts.get(scopeRef) ?? 0) + 1);
    }
  }

  return counts;
}

/**
 * Build selectable entity scope roots for TraceLens from the workspace catalog and loaded diagrams.
 */
export function buildTraceLensScopeOptions(
  systems: readonly LoadedSystemRef[],
  catalog: readonly WorkspaceCatalogEntry[],
  rankedOffenders: readonly RankedOffender[]
): TraceLensScopeOption[] {
  const names = new Map<string, string>();
  const levels = new Map<string, C4Level>();

  for (const entry of catalog) {
    names.set(entry.entityRef, entry.name);
    levels.set(entry.entityRef, entry.level);
  }

  for (const system of systems) {
    for (const node of system.schema.nodes) {
      if (!node.entityRef || node.external) continue;
      names.set(node.entityRef, node.name);
      if (!levels.has(node.entityRef)) {
        levels.set(node.entityRef, system.schema.level);
      }
    }
  }

  const offenderEntityRefs = new Set(rankedOffenders.map(offender => offender.entityRef));
  const candidateRefs = new Set(names.keys());
  const offenderCounts = indexOffenderCountsByScope(systems, rankedOffenders, candidateRefs);

  const options: TraceLensScopeOption[] = [];

  for (const [entityRef, name] of names) {
    const level = levels.get(entityRef) ?? 'container';
    const offenderCount = offenderCounts.get(entityRef) ?? 0;
    const isOffender = offenderEntityRefs.has(entityRef);

    if (!isStructuralLevel(level) && offenderCount === 0 && !isOffender) continue;

    options.push({
      entityRef,
      name,
      level,
      depth: entityRef.split('/').filter(Boolean).length,
      offenderCount,
    });
  }

  return options.sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.name.localeCompare(b.name);
  });
}

export function filterTraceLensScopeOptions(
  options: readonly TraceLensScopeOption[],
  query: string
): TraceLensScopeOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...options];

  return options.filter(
    option =>
      option.name.toLowerCase().includes(q) ||
      option.entityRef.toLowerCase().includes(q) ||
      option.level.toLowerCase().includes(q)
  );
}

export function findTraceLensScopeOption(
  options: readonly TraceLensScopeOption[],
  entityRef: string | null | undefined
): TraceLensScopeOption | undefined {
  if (!entityRef) return undefined;
  return options.find(option => option.entityRef === entityRef);
}
