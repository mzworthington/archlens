import { resolveEntityHome, type WorkspaceCatalogEntry } from '@archlens/core';
import { buildWorkspacePath } from './workspaceUrl';

export type NavigateToWorkspaceEntityActions = {
  workspaceCatalog: WorkspaceCatalogEntry[];
  setLocation: (path: string) => void;
};

/**
 * Navigate to `/workspace/<entityRef>`. Diagram load and node selection run from
 * the URL in `useUrlSync`. Returns false when the ref is not in the catalog.
 */
export function navigateToWorkspaceEntity(
  entityRef: string,
  actions: NavigateToWorkspaceEntityActions
): boolean {
  const home = resolveEntityHome(actions.workspaceCatalog, entityRef);
  if (!home) return false;

  actions.setLocation(buildWorkspacePath(entityRef));
  return true;
}
