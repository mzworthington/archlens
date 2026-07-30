import { useEffect, useRef } from 'react';
import { resolveEntityHome, type WorkspaceCatalogEntry } from '@archlens/core';
import type { LoadedSystemRef, OffenderScope } from '../../../application/forensics/rankOffenders';

/**
 * When a deep link targets a container entity, default the ranking scope to Containers.
 */
export function useTraceLensScopeFromUrl({
  scopeEntityRef,
  workspaceCatalog,
  loadedSystems,
  setScope,
}: {
  scopeEntityRef: string | null;
  workspaceCatalog: readonly WorkspaceCatalogEntry[];
  loadedSystems: readonly LoadedSystemRef[];
  setScope: (scope: OffenderScope) => void;
}): void {
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!scopeEntityRef || appliedRef.current === scopeEntityRef) return;

    const ownDiagram = workspaceCatalog.find(entry => entry.entityRef === scopeEntityRef);
    if (ownDiagram?.level === 'container' || ownDiagram?.level === 'context') {
      setScope('containers');
      appliedRef.current = scopeEntityRef;
      return;
    }

    const home = resolveEntityHome(workspaceCatalog, scopeEntityRef);
    if (home?.level === 'container' || home?.level === 'context') {
      const node = loadedSystems
        .find(system => system.path === home.path)
        ?.schema.nodes.find(candidate => candidate.entityRef === scopeEntityRef);
      if (node?.type === 'container') {
        setScope('containers');
        appliedRef.current = scopeEntityRef;
      }
    }
  }, [scopeEntityRef, workspaceCatalog, loadedSystems, setScope]);
}
