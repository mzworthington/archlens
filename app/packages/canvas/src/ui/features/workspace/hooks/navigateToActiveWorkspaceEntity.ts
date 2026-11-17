import { getSchemaEntityRef } from '@archlens/core';
import { useBlueprintStore } from '../../../../application/store/store';
import { buildWorkspaceEntityHref } from '../../../../application/store/sandboxWorkspace';
import { resolveDemoLandingEntityRef } from '../../../../application/store/samplesWorkspace';

/** Navigate to the active diagram entity after a successful workspace open. */
export function navigateToActiveWorkspaceEntity(
  setLocation: (path: string, options?: { replace?: boolean }) => void,
  options?: { replace?: boolean; sample?: boolean }
): void {
  const { schema, workspaceName, isWorkspaceOpen, isSampleWorkspace, workspaceCatalog } =
    useBlueprintStore.getState();
  if (!isWorkspaceOpen) return;

  const openedEntityRef = getSchemaEntityRef(schema, workspaceName);
  const entityRef =
    options?.sample || isSampleWorkspace
      ? resolveDemoLandingEntityRef(workspaceCatalog, openedEntityRef)
      : openedEntityRef;

  setLocation(buildWorkspaceEntityHref(entityRef), { replace: options?.replace ?? true });
}
