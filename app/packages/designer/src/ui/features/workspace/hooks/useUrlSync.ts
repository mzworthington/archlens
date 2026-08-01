import { useEffect, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import { resolveEntityHome } from '@archlens/core';

function workspaceEntityRefFromUrl(pathAfterWorkspace: string | undefined): string | undefined {
  const trimmed = pathAfterWorkspace?.replace(/\/$/, '');
  return trimmed || undefined;
}

/**
 * Load the active diagram from `/workspace/<entityRef>` when the URL changes.
 * Navigation (breadcrumbs, canvas zoom, search) sets the URL; this hook only reads it.
 */
export function useUrlSync(): void {
  const [location] = useLocation();
  const [, params] = useRoute('/workspace/*');

  const isStartupOpen = useBlueprintStore(s => s.isStartupOpen);
  const diagramLoadCount = useBlueprintStore(s => s.diagramLoadCount);
  const workspaceCatalog = useBlueprintStore(s => s.workspaceCatalog);

  const lastAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    const onWorkspace = location === '/' || location === '' || location.startsWith('/workspace');
    if (!onWorkspace) return;
    if (diagramLoadCount > 0) return;
    if (isStartupOpen) return;

    const entityRef = workspaceEntityRefFromUrl(params?.['*']);
    if (!entityRef) {
      lastAppliedRef.current = location;
      return;
    }

    const syncKey = `${location}::${workspaceCatalog.length}`;
    if (lastAppliedRef.current === syncKey) return;

    const {
      workspaceCatalog: catalog,
      currentFilePath,
      selectSystem,
      selectNode,
      systemSelectInFlight,
    } = useBlueprintStore.getState();

    const home = resolveEntityHome(catalog, entityRef);
    if (!home) return;

    const isNodeTarget = home.entityRef !== entityRef;
    const targetPath = home.path;

    lastAppliedRef.current = syncKey;

    if (targetPath !== currentFilePath) {
      if (systemSelectInFlight !== targetPath) {
        void selectSystem(targetPath).then(() => {
          if (isNodeTarget) selectNode(entityRef, { expandPanel: true });
        });
      }
      return;
    }

    if (isNodeTarget) {
      selectNode(entityRef, { expandPanel: true });
    }
  }, [location, params, isStartupOpen, diagramLoadCount, workspaceCatalog]);
}
