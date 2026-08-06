import { useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import {
  claimDemoBootstrap,
  isFolderWorkspacePreferred,
  releaseDemoBootstrapClaim,
} from '../../../../application/store/workspaceOpenSession';

function entityRefFromWorkspaceUrl(pathAfterWorkspace: string | undefined): string | undefined {
  const trimmed = pathAfterWorkspace?.replace(/\/$/, '');
  return trimmed || undefined;
}

/**
 * When a deployed user follows `/workspace/<entityRef>` with no workspace open yet,
 * load the bundled demo so deep links resolve. Never re-forces demo after the user
 * has opened a local folder this session (including while a prior demo load is in flight).
 */
export function useBundledWorkspaceBootstrap(): void {
  const [location] = useLocation();
  const [, params] = useRoute('/workspace/*');

  useEffect(() => {
    const entityRef = entityRefFromWorkspaceUrl(params?.['*']);
    if (!entityRef) return;

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
      } else {
        releaseDemoBootstrapClaim();
      }
    })();
  }, [location, params]);
}
