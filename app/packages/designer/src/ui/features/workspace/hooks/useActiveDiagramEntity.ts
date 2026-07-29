import { useMemo } from 'react';
import { entityRefParentPrefix, getSchemaEntityRef } from '@archlens/core';
import { useBlueprintStore } from '../../../../application/store/store';

/** Active diagram identity and parent ref - same entityRef rules as breadcrumbs. */
export function useActiveDiagramEntity() {
  const schema = useBlueprintStore(state => state.schema);
  const workspaceName = useBlueprintStore(state => state.workspaceName);
  const isWorkspaceOpen = useBlueprintStore(state => state.isWorkspaceOpen);
  const workspaceCatalog = useBlueprintStore(state => state.workspaceCatalog);
  const loadedSystems = useBlueprintStore(state => state.loadedSystems);

  return useMemo(() => {
    const activeEntityRef = getSchemaEntityRef(schema, isWorkspaceOpen ? workspaceName : undefined);
    const contextFromCatalog = workspaceCatalog.find(entry => entry.level === 'context')?.entityRef;
    const contextSystem = loadedSystems.find(system => system.schema.level === 'context');
    const contextEntityRef =
      contextFromCatalog ??
      (contextSystem
        ? getSchemaEntityRef(contextSystem.schema, isWorkspaceOpen ? workspaceName : undefined)
        : undefined);
    const parentEntityRef = entityRefParentPrefix(activeEntityRef, contextEntityRef);

    return { activeEntityRef, contextEntityRef, parentEntityRef };
  }, [schema, workspaceName, isWorkspaceOpen, workspaceCatalog, loadedSystems]);
}
