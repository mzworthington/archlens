import { useEffect, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import { guessBundledPathForEntityRef } from '../../../../application/store/states/diagramState/bundledBlueprintLoader';
import { SANDBOX_RELOAD_IN_FLIGHT } from '../../../../application/store/diagramLoadSession';
import { getSchemaEntityRef, resolveEntityHome, resolveChildDiagramEntry } from '@archlens/core';

function splitWorkspacePath(pathAfterWorkspace: string | undefined): string[] {
  return pathAfterWorkspace?.replace(/\/$/, '').split('/').filter(Boolean) ?? [];
}

/**
 * Synchronises the browser URL with the active diagram (`/workspace/<entityRef>`).
 */
export function useUrlSync(): void {
  const {
    schema,
    loadedSystems,
    selectSystem,
    selectNode,
    selectedNodeId,
    currentFilePath,
    workspaceName,
    workspaceCatalog,
    isWorkspaceOpen,
    isStartupOpen,
    loadBundledSandbox,
  } = useBlueprintStore();

  const [location, setLocation] = useLocation();
  const [match, params] = useRoute('/workspace/*');

  const prevLocationRef = useRef<string | null>(null);
  const prevSelectedNodeIdRef = useRef<string | null | undefined>(undefined);
  const systemSelectInFlight = useBlueprintStore(s => s.systemSelectInFlight);
  const diagramLoadCount = useBlueprintStore(s => s.diagramLoadCount);
  const sandboxBootstrapRef = useRef(false);

  useEffect(() => {
    const isWorkspaceRoute =
      location.startsWith('/workspace') || location === '/' || location === '';
    if (!isWorkspaceRoute) return;

    if (diagramLoadCount > 0 || systemSelectInFlight === SANDBOX_RELOAD_IN_FLIGHT) return;

    const pathAfterWorkspace = params?.['*'];

    const locationChanged = prevLocationRef.current !== location;
    const selectionChanged = prevSelectedNodeIdRef.current !== selectedNodeId;
    const isInitialSync = prevLocationRef.current === null;
    prevLocationRef.current = location;
    prevSelectedNodeIdRef.current = selectedNodeId;

    const segments = splitWorkspacePath(pathAfterWorkspace);
    const isWorkspaceRoot = location === '/workspace' || location === '/workspace/';

    if (isWorkspaceRoot && isStartupOpen) return;

    const entityRef = isWorkspaceOpen
      ? pathAfterWorkspace?.replace(/\/$/, '') || undefined
      : segments.length > 0
        ? segments.join('/')
        : undefined;

    if (!isWorkspaceOpen && loadedSystems.length === 0 && !sandboxBootstrapRef.current) {
      sandboxBootstrapRef.current = true;
      void loadBundledSandbox().finally(() => {
        sandboxBootstrapRef.current = false;
      });
      return;
    }

    const diagramEntityRef = getSchemaEntityRef(
      schema,
      isWorkspaceOpen ? workspaceName : undefined
    );

    const selectedSchemaNode = selectedNodeId
      ? schema?.nodes.find(node => node.entityRef === selectedNodeId)
      : undefined;

    const workspacePathForEntity = (ref: string): string => `/workspace/${ref}`;

    if (selectionChanged && !locationChanged && !isInitialSync) {
      const hasChildDiagram =
        !!selectedNodeId && !!resolveChildDiagramEntry(workspaceCatalog, selectedNodeId);
      const useNodeInUrl = selectedNodeId && !selectedSchemaNode?.external && !hasChildDiagram;
      const targetPath = useNodeInUrl
        ? workspacePathForEntity(selectedNodeId)
        : workspacePathForEntity(diagramEntityRef);
      if (location !== targetPath) {
        setLocation(targetPath, { replace: true });
      }
      return;
    }

    const home = entityRef ? resolveEntityHome(workspaceCatalog, entityRef) : undefined;
    const isNodeTarget = !!(home && entityRef && home.entityRef !== entityRef);
    const diagramMatchesUrl = !entityRef || diagramEntityRef === entityRef || isNodeTarget;

    if (!locationChanged && !isInitialSync && diagramMatchesUrl) return;

    if (isNodeTarget && home && home.path === currentFilePath) {
      selectNode(entityRef, { expandPanel: true });
      return;
    }

    let foundSystem: (typeof loadedSystems)[0] | undefined;

    if (!entityRef) {
      foundSystem = loadedSystems[0];
    } else {
      foundSystem = loadedSystems.find(sys => {
        const dRef = getSchemaEntityRef(sys.schema, isWorkspaceOpen ? workspaceName : undefined);
        return dRef === entityRef;
      });
    }

    if (!foundSystem && entityRef) {
      const catalogEntry = workspaceCatalog.find(entry => entry.entityRef === entityRef);
      const path = home?.path ?? catalogEntry?.path ?? guessBundledPathForEntityRef(entityRef);
      if (path) {
        if (systemSelectInFlight !== path) {
          void selectSystem(path).then(() => {
            if (isNodeTarget && entityRef) selectNode(entityRef, { expandPanel: true });
          });
        } else if (isNodeTarget && entityRef) {
          selectNode(entityRef, { expandPanel: true });
        }
        return;
      }
    }

    if (foundSystem) {
      if (foundSystem.path !== currentFilePath) {
        if (systemSelectInFlight !== foundSystem.path) {
          void selectSystem(foundSystem.path).then(() => {
            if (isNodeTarget && entityRef) selectNode(entityRef, { expandPanel: true });
          });
        }
        return;
      }

      if (isNodeTarget && entityRef) {
        selectNode(entityRef, { expandPanel: true });
        return;
      }

      const diagramPath = workspacePathForEntity(diagramEntityRef);
      if (location !== diagramPath) {
        setLocation(diagramPath, { replace: true });
      }
    }
  }, [
    location,
    schema,
    currentFilePath,
    workspaceName,
    loadedSystems,
    workspaceCatalog,
    selectSystem,
    selectNode,
    selectedNodeId,
    setLocation,
    match,
    params,
    isWorkspaceOpen,
    isStartupOpen,
    loadBundledSandbox,
    systemSelectInFlight,
    diagramLoadCount,
  ]);
}
