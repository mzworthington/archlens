import { useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import {
  claimDemoBootstrap,
  isFolderWorkspacePreferred,
  releaseDemoBootstrapClaim,
} from '../../../../application/store/workspaceOpenSession';
import { GOLDEN_JOURNEY_ENTITY_REF } from '../../../../application/store/samplesWorkspace';
import { buildChaosLensUrl } from '../../../../application/resilience/chaosLensUrl';
import { isWorkspacePath } from '../../../../application/navigation/workspaceUrl';

function entityRefFromWorkspaceUrl(pathAfterWorkspace: string | undefined): string | undefined {
  const trimmed = pathAfterWorkspace?.replace(/\/$/, '');
  return trimmed || undefined;
}

/**
 * Demo-first bootstrap:
 * - Bare `/workspace` → open the sandbox and land on ChaosLens (golden journey).
 * - Deep link `/workspace/<entityRef>` → open sandbox so the entity resolves.
 * Never re-forces demo after the user opened a folder / browser scan this session.
 */
export function useBundledWorkspaceBootstrap(): void {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute('/workspace/*');

  useEffect(() => {
    const entityRef = entityRefFromWorkspaceUrl(params?.['*']);
    const bareWorkspace = !entityRef && isWorkspacePath(location.split('?')[0] ?? location);
    if (!entityRef && !bareWorkspace) return;

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
        if (bareWorkspace) {
          setLocation(buildChaosLensUrl(GOLDEN_JOURNEY_ENTITY_REF), { replace: true });
        }
      } else {
        releaseDemoBootstrapClaim();
      }
    })();
  }, [location, params, setLocation]);
}
