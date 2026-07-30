import {
  resolveChildDiagramEntry,
  resolveEntityHome,
  type WorkspaceCatalogEntry,
} from '@archlens/core';
import { resolveBundledPathsForEntityRef } from '../store/states/diagramState/bundledBlueprintLoader';

/** YAML paths that must be loaded before TraceLens can rank a scoped entity subtree. */
export function resolveDiagramPathsForEntityScope(
  entityRef: string,
  catalog: readonly WorkspaceCatalogEntry[],
  isWorkspaceOpen: boolean
): string[] {
  if (!entityRef) return [];

  const paths = new Set<string>();

  const home = resolveEntityHome(catalog, entityRef);
  if (home) paths.add(home.path);

  const childDiagram = resolveChildDiagramEntry(catalog, entityRef);
  if (childDiagram) paths.add(childDiagram.path);

  const parentPrefix = entityRef.includes('/')
    ? entityRef.split('/').slice(0, -1).join('/')
    : undefined;
  if (parentPrefix) {
    const parentHome = resolveEntityHome(catalog, parentPrefix);
    if (parentHome) paths.add(parentHome.path);
  }

  if (!isWorkspaceOpen) {
    for (const path of resolveBundledPathsForEntityRef(entityRef)) {
      paths.add(path);
    }
  }

  return [...paths];
}
