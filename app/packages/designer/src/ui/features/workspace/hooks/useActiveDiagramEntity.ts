import { useMemo } from 'react';
import { buildCatalogAncestorChain, getSchemaEntityRef } from '@archlens/core';
import { useBlueprintStore } from '../../../../application/store/store';

/** Active diagram identity and parent ref - same entityRef rules as breadcrumbs. */
export function useActiveDiagramEntity() {
  const schema = useBlueprintStore(state => state.schema);
  const workspaceName = useBlueprintStore(state => state.workspaceName);
  const isWorkspaceOpen = useBlueprintStore(state => state.isWorkspaceOpen);
  const workspaceCatalog = useBlueprintStore(state => state.workspaceCatalog);

  return useMemo(() => {
    const activeEntityRef = getSchemaEntityRef(schema, isWorkspaceOpen ? workspaceName : undefined);
    const chain = buildCatalogAncestorChain(workspaceCatalog, activeEntityRef);
    const contextEntityRef = chain.find(entry => entry.level === 'context')?.entityRef;
    const parentEntityRef = chain.length > 1 ? chain[chain.length - 2]?.entityRef : undefined;

    return { activeEntityRef, contextEntityRef, parentEntityRef };
  }, [schema, workspaceName, isWorkspaceOpen, workspaceCatalog]);
}
