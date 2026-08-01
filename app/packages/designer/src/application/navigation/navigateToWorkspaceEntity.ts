import { resolveEntityHome, type WorkspaceCatalogEntry } from '@archlens/core';

export type NavigateToWorkspaceEntityActions = {
  workspaceCatalog: WorkspaceCatalogEntry[];
  setLocation: (path: string) => void;
};

/**
 * Navigate to `/workspace/<entityRef>`. Diagram load and node selection are handled
 * Navigation sets `/workspace/<entityRef>`; diagram load runs from the URL in `useUrlSync`.
 * Returns false when the ref is not present in the loaded workspace catalog.
 */
export function navigateToWorkspaceEntity(
  entityRef: string,
  actions: NavigateToWorkspaceEntityActions
): boolean {
  const home = resolveEntityHome(actions.workspaceCatalog, entityRef);
  if (!home) return false;

  actions.setLocation(`/workspace/${entityRef}`);
  return true;
}
