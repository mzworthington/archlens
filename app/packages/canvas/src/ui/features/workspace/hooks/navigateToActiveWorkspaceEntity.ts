import { getSchemaEntityRef } from '@archlens/core';
import { useBlueprintStore } from '../../../../application/store/store';
import { buildWorkspaceEntityHref } from '../../../../application/store/sandboxWorkspace';
import { SAMPLES_ENTITY_REF } from '../../../../application/store/samplesWorkspace';

/** Navigate to the active diagram entity after a successful workspace open. */
export function navigateToActiveWorkspaceEntity(
  setLocation: (path: string, options?: { replace?: boolean }) => void,
  options?: { replace?: boolean; sample?: boolean }
): void {
  const { schema, workspaceName, isWorkspaceOpen, isSampleWorkspace } =
    useBlueprintStore.getState();
  if (!isWorkspaceOpen) return;

  const entityRef =
    options?.sample || isSampleWorkspace
      ? SAMPLES_ENTITY_REF
      : getSchemaEntityRef(schema, workspaceName);

  setLocation(buildWorkspaceEntityHref(entityRef), { replace: options?.replace ?? true });
}
