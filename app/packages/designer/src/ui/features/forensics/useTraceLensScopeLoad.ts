import { useEffect } from 'react';
import type { WorkspaceCatalogEntry } from '@archlens/core';
import { resolveDiagramPathsForEntityScope } from '../../../application/forensics/resolveTraceLensScopeDiagrams';
import { ensureSystemLoaded } from '../../../application/store/states/ioState/ensureSystemLoaded';
import { useBlueprintStore } from '../../../application/store/store';
import { BundledSampleWorkspaceAdapter } from '../../../infrastructure/fileSystem/bundledSampleWorkspace';

type LoadedSystem = { path: string };

/**
 * Priority-load diagrams referenced by a TraceLens scope deep link so rankings
 * appear for the scoped entity without switching the active canvas diagram.
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
    if (!scopeEntityRef || !hasScope || !isWorkspaceOpen) return;

    const paths = resolveDiagramPathsForEntityScope(scopeEntityRef, workspaceCatalog).filter(
      path => !loadedSystems.some(system => system.path === path)
    );

    if (paths.length === 0) return;

    let cancelled = false;

    void (async () => {
      const state = useBlueprintStore.getState();
      const { logger, workspacePort, workingCopyPort, isSampleWorkspace } = state;
      const activeWorkspacePort = isSampleWorkspace ? BundledSampleWorkspaceAdapter : workspacePort;

      for (const path of paths) {
        if (cancelled) return;

        await ensureSystemLoaded(path, {
          workspacePort: activeWorkspacePort,
          workingCopyPort,
          logger,
          get: () => useBlueprintStore.getState(),
          set: partial => useBlueprintStore.setState(partial),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scopeEntityRef, hasScope, isWorkspaceOpen, workspaceCatalog, loadedSystems]);
}
