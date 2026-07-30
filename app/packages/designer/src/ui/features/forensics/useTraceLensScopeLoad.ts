import { useEffect } from 'react';
import type { WorkspaceCatalogEntry } from '@archlens/core';
import { resolveDiagramPathsForEntityScope } from '../../../application/forensics/resolveTraceLensScopeDiagrams';
import { ensureBundledSystemLoaded } from '../../../application/store/states/diagramState/bundledBlueprintLoader';
import { ensureSystemLoaded } from '../../../application/store/states/ioState/ensureSystemLoaded';
import { useBlueprintStore } from '../../../application/store/store';

type LoadedSystem = { path: string };

/**
 * Priority-load diagrams referenced by a TraceLens scope deep link so rankings
 * appear without waiting for the full background prefetch queue.
 *
 * Loads into `loadedSystems` only — does not switch the active canvas diagram.
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
      const state = useBlueprintStore.getState();
      const { logger } = state;

      for (const path of paths) {
        if (cancelled) return;

        if (isWorkspaceOpen) {
          const { workspacePort, workingCopyPort } = useBlueprintStore.getState();
          await ensureSystemLoaded(path, {
            workspacePort,
            workingCopyPort,
            logger,
            get: () => useBlueprintStore.getState(),
            set: partial => useBlueprintStore.setState(partial),
          });
        } else {
          await ensureBundledSystemLoaded(path, {
            get: () => useBlueprintStore.getState(),
            set: partial => useBlueprintStore.setState(partial),
            logger,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scopeEntityRef, hasScope, isWorkspaceOpen, workspaceCatalog, loadedSystems]);
}
