import { useEffect } from 'react';
import { useLocation, useRoute, useSearch } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import {
  claimDemoBootstrap,
  isFolderWorkspacePreferred,
  releaseDemoBootstrapClaim,
} from '../../../../application/store/workspaceOpenSession';
import {
  isWorkspacePath,
  workspaceEntityRefFromPath,
  workspaceEntityRefFromRouteParam,
} from '../../../../application/navigation/workspaceUrl';
import { parseCollabRoomId } from '../../../../application/navigation/collabRoomUrl';
import {
  COLLABORATION_FEATURE,
  isFeatureEnabled,
} from '../../../../application/navigation/featureGate';
import { EMPTY_WORKSPACE_ENTITY_REF } from '../../../../application/store/states/diagramState/resetToEmptyWorkspace';

/**
 * Workspace bootstrap:
 * - Bare `/workspace` (or `/workspace/`) → show the startup chooser (do not auto-open demo).
 * - Deep link `/workspace/<entityRef>` → open sandbox so the entity resolves.
 * - Collab flag + empty-workspace or `?room=` → stay on the current canvas (do not load demo).
 * Never re-forces demo after the user opened a folder / browser scan this session.
 */
export function useBundledWorkspaceBootstrap(): void {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute('/workspace/*');
  const search = useSearch();
  // Depend on the splat string — wouter returns a new params object every render.
  const routeSplat = params?.['*'];

  useEffect(() => {
    const pathOnly = location.split('?')[0] ?? location;
    if (!isWorkspacePath(pathOnly)) return;

    const entityRef =
      workspaceEntityRefFromRouteParam(routeSplat) ??
      // Bare `/workspace` is a separate route; useRoute('/workspace/*') may not match.
      workspaceEntityRefFromPath(pathOnly);

    const collabEnabled = isFeatureEnabled(COLLABORATION_FEATURE, search);
    const skipDemoForCollab =
      collabEnabled &&
      (Boolean(parseCollabRoomId(search)) || entityRef === EMPTY_WORKSPACE_ENTITY_REF);

    if (skipDemoForCollab) {
      const { isStartupOpen, setIsStartupOpen } = useBlueprintStore.getState();
      if (isStartupOpen) setIsStartupOpen(false);
      return;
    }

    if (!entityRef) {
      const { isWorkspaceOpen, isStartupOpen, setIsStartupOpen } = useBlueprintStore.getState();
      if (!isWorkspaceOpen && !isStartupOpen) {
        setIsStartupOpen(true);
      }
      return;
    }

    const { isWorkspaceOpen, openBundledSample, setIsStartupOpen } = useBlueprintStore.getState();
    if (isWorkspaceOpen) return;
    if (isFolderWorkspacePreferred()) return;
    if (!claimDemoBootstrap()) return;

    void (async () => {
      const opened = await openBundledSample();
      const state = useBlueprintStore.getState();
      // Folder open may have won the race while demo load was in flight.
      if (state.isWorkspaceOpen && !state.isSampleWorkspace) {
        setIsStartupOpen(false);
        return;
      }
      if (isFolderWorkspacePreferred()) {
        setIsStartupOpen(false);
        return;
      }
      if (opened) {
        setIsStartupOpen(false);
        // Deep link stays on the requested entity; URL sync loads the diagram.
      } else {
        releaseDemoBootstrapClaim();
      }
    })();
  }, [location, routeSplat, search, setLocation]);
}
