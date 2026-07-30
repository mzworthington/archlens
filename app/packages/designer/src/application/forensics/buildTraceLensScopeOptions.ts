import type { C4Level, WorkspaceCatalogEntry } from '@archlens/core';
import {
  offenderMatchesEntityScope,
  type LoadedSystemRef,
  type RankedOffender,
} from './rankOffenders';

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

  const options: TraceLensScopeOption[] = [];

  for (const [entityRef, name] of names) {
    const level = levels.get(entityRef) ?? 'container';
    const offenderCount = rankedOffenders.filter(offender =>
      offenderMatchesEntityScope(offender, entityRef, systems)
    ).length;
    const isOffender = rankedOffenders.some(offender => offender.entityRef === entityRef);

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
