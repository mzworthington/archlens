import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import { GOLDEN_PATHS_CONTEXT_PATH } from '../../../../application/store/defaultData';
import { buildWorkspaceEntityHref } from '../../../../application/store/sandboxWorkspace';

function isWorkspaceRootPath(location: string): boolean {
  return location === '/workspace' || location === '/workspace/';
}

const GOLDEN_PATHS_CONTEXT_HREF = buildWorkspaceEntityHref('golden-paths');

/**
 * Bare `/workspace` auto-loads the bundled Golden Paths context (no multi-option chooser).
 */
export function useAutoLoadWorkspace(
  location: string,
  setIsStartupOpen: (open: boolean) => void
): void {
  const [, setLocation] = useLocation();
  const bootstrapRef = useRef(false);

  useEffect(() => {
    if (!isWorkspaceRootPath(location)) return;
    if (bootstrapRef.current) return;
    bootstrapRef.current = true;

    void (async () => {
      const { loadBundledSandbox } = useBlueprintStore.getState();
      await loadBundledSandbox();
      await useBlueprintStore.getState().selectSystem(GOLDEN_PATHS_CONTEXT_PATH);
      setIsStartupOpen(false);
      setLocation(GOLDEN_PATHS_CONTEXT_HREF, { replace: true });
    })();
  }, [location, setIsStartupOpen, setLocation]);
}
