import { useEffect, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';

function entityRefFromWorkspaceUrl(pathAfterWorkspace: string | undefined): string | undefined {
  const trimmed = pathAfterWorkspace?.replace(/\/$/, '');
  return trimmed || undefined;
}

/**
 * When a deployed user follows `/workspace/<entityRef>`, load the bundled blueprints
 * workspace so peer context diagrams are available without a local folder picker.
 * Keeps the requested entityRef in the URL so deep links (e.g. golden-journey estate)
 * resolve to the matching diagram instead of being rewritten.
 */
export function useBundledWorkspaceBootstrap(): void {
  const [location] = useLocation();
  const [, params] = useRoute('/workspace/*');
  const bootstrapStarted = useRef(false);

  useEffect(() => {
    const entityRef = entityRefFromWorkspaceUrl(params?.['*']);
    if (!entityRef) return;

    const { isWorkspaceOpen, openBundledSample, setIsStartupOpen } = useBlueprintStore.getState();
    if (isWorkspaceOpen || bootstrapStarted.current) return;

    bootstrapStarted.current = true;
    void (async () => {
      const opened = await openBundledSample();
      if (opened) {
        setIsStartupOpen(false);
      } else {
        bootstrapStarted.current = false;
      }
    })();
  }, [location, params]);
}
