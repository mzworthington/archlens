import { useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import {
  claimDemoBootstrap,
  isFolderWorkspacePreferred,
  releaseDemoBootstrapClaim,
} from '../../../../application/store/workspaceOpenSession';
import { isWorkspacePath } from '../../../../application/navigation/workspaceUrl';

function entityRefFromWorkspaceUrl(pathAfterWorkspace: string | undefined): string | undefined {
  const trimmed = pathAfterWorkspace?.replace(/^\/+/, '').replace(/\/$/, '');
  return trimmed || undefined;
}

/**
 * Workspace bootstrap:
 * - Bare `/workspace` → show the startup chooser (do not auto-open demo).
 * - Deep link `/workspace/<entityRef>` → open sandbox so the entity resolves.
 * Never re-forces demo after the user opened a folder / browser scan this session.
 */
export function useBundledWorkspaceBootstrap(): void {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute('/workspace/*');

  useEffect(() => {
    const pathOnly = location.split('?')[0] ?? location;
    if (!isWorkspacePath(pathOnly)) return;

    const entityRef =
      entityRefFromWorkspaceUrl(params?.['*']) ??
      // Bare `/workspace` is a separate route; useRoute('/workspace/*') may not match.
      (pathOnly === '/workspace' || pathOnly === '/workspace/'
        ? undefined
        : pathOnly.replace(/^\/workspace\/?/, '') || undefined);

    if (!entityRef) {
      const { isWorkspaceOpen, setIsStartupOpen } = useBlueprintStore.getState();
      if (!isWorkspaceOpen) {
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
  }, [location, params, setLocation]);
}
