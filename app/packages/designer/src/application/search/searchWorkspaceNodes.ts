import type { SystemNode, SystemSchema } from '@blueprint/core';

export type LoadedSystemRef = {
  path: string;
  name: string;
  schema: SystemSchema;
};

export type WorkspaceSearchHit = {
  node: SystemNode;
  diagramName: string;
  diagramPath: string;
  isCurrentDiagram: boolean;
};

export type WorkspaceSearchOptions = {
  showTests: boolean;
  showExternals: boolean;
};

function nodeMatchesQuery(node: SystemNode, query: string): boolean {
  const matchName = node.name?.toLowerCase().includes(query);
  const matchId = node.entityRef?.toLowerCase().includes(query);
  const matchType = node.type?.toLowerCase().includes(query);
  const matchProps =
    node.properties &&
    Object.values(node.properties).some(val => String(val).toLowerCase().includes(query));
  return Boolean(matchName || matchId || matchType || matchProps);
}

/**
 * Search nodes across every loaded diagram. Hits from the active diagram are
 * returned first; remaining matches are sorted by node name.
 */
export function searchWorkspaceNodes(
  loadedSystems: LoadedSystemRef[],
  currentFilePath: string | null | undefined,
  query: string,
  options: WorkspaceSearchOptions
): WorkspaceSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q || loadedSystems.length === 0) return [];

  const hitsByRef = new Map<string, WorkspaceSearchHit>();

  for (const system of loadedSystems) {
    const isCurrentDiagram = Boolean(currentFilePath && system.path === currentFilePath);
    for (const node of system.schema.nodes) {
      const ref = node.entityRef;
      if (!ref) continue;
      if (!options.showTests && node.isTest) continue;
      if (!options.showExternals && node.external) continue;
      if (!nodeMatchesQuery(node, q)) continue;

      const hit: WorkspaceSearchHit = {
        node,
        diagramName: system.schema.name || system.name,
        diagramPath: system.path,
        isCurrentDiagram,
      };

      const existing = hitsByRef.get(ref);
      if (!existing || (hit.isCurrentDiagram && !existing.isCurrentDiagram)) {
        hitsByRef.set(ref, hit);
      }
    }
  }

  return [...hitsByRef.values()].sort((a, b) => {
    if (a.isCurrentDiagram !== b.isCurrentDiagram) {
      return a.isCurrentDiagram ? -1 : 1;
    }
    const nameCmp = (a.node.name || '').localeCompare(b.node.name || '', undefined, {
      sensitivity: 'base',
    });
    if (nameCmp !== 0) return nameCmp;
    return (a.node.entityRef || '').localeCompare(b.node.entityRef || '', undefined, {
      sensitivity: 'base',
    });
  });
}
