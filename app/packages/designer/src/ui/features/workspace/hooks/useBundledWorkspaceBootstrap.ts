import { useEffect, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import {
  GOLDEN_JOURNEY_ENTITY_REF,
  GOLDEN_PATHS_ENTITY_REF,
} from '../../../../application/store/goldenPathsSample';
import { buildWorkspaceEntityHref } from '../../../../application/store/sandboxWorkspace';

function entityRefFromWorkspaceUrl(pathAfterWorkspace: string | undefined): string | undefined {
  const trimmed = pathAfterWorkspace?.replace(/\/$/, '');
  return trimmed || undefined;
}

/**
 * When a deployed user follows `/workspace/<entityRef>`, load the bundled blueprints
 * workspace so peer context diagrams are available without a local folder picker.
 */
export function useBundledWorkspaceBootstrap(): void {
  const [location, setLocation] = useLocation();
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
        // Bare estate URLs without lens params should land on the context diagram.
        if (entityRef === GOLDEN_JOURNEY_ENTITY_REF && !window.location.search) {
          setLocation(buildWorkspaceEntityHref(GOLDEN_PATHS_ENTITY_REF), { replace: true });
        }
      } else {
        bootstrapStarted.current = false;
      }
    })();
  }, [location, params, setLocation]);
}
