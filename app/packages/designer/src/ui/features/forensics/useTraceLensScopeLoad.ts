import { useEffect } from 'react';
import type { WorkspaceCatalogEntry } from '@archlens/core';
import { resolveDiagramPathsForEntityScope } from '../../../application/forensics/resolveTraceLensScopeDiagrams';
import { ensureBundledSystemLoaded } from '../../../application/store/states/diagramState/bundledBlueprintLoader';
import { useBlueprintStore } from '../../../application/store/store';

type LoadedSystem = { path: string };

/**
 * Priority-load diagrams referenced by a TraceLens scope deep link so rankings
 * appear without waiting for the full background prefetch queue.
 */
export function useTraceLensScopeLoad({
  scopeEntityRef,
  hasScope,
  isWorkspaceOpen,
  workspaceCatalog,
  loadedSystems,
}: {
  scopeEntityRef: string | null;
  hasScope: boolean;
  isWorkspaceOpen: boolean;
  workspaceCatalog: readonly WorkspaceCatalogEntry[];
  loadedSystems: readonly LoadedSystem[];
}): void {
  const selectSystem = useBlueprintStore(s => s.selectSystem);

  useEffect(() => {
    if (!scopeEntityRef || !hasScope) return;

    const paths = resolveDiagramPathsForEntityScope(
      scopeEntityRef,
      workspaceCatalog,
      isWorkspaceOpen
    ).filter(path => !loadedSystems.some(system => system.path === path));

    if (paths.length === 0) return;

    let cancelled = false;

    void (async () => {
      for (const path of paths) {
        if (cancelled) return;

        if (isWorkspaceOpen) {
          await selectSystem(path);
        } else {
          await ensureBundledSystemLoaded(path, {
            get: () => useBlueprintStore.getState(),
            set: partial => useBlueprintStore.setState(partial),
            logger: useBlueprintStore.getState().logger,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scopeEntityRef, hasScope, isWorkspaceOpen, workspaceCatalog, loadedSystems, selectSystem]);
}
