import { useEffect, useRef } from 'react';
import { useBlueprintStore } from '../../../../application/store/store';
import { loadWorkspaceSession } from '../../../../application/store/workspaceSession';

function isWorkspaceRootPath(location: string): boolean {
  return location === '/workspace' || location === '/workspace/';
}

/**
 * On bare `/workspace`, restore a prior sandbox session when possible.
 * First-time visitors and expired folder sessions keep the startup chooser open.
 */
export function useAutoLoadWorkspace(
  location: string,
  setIsStartupOpen: (open: boolean) => void,
  setLocation: (path: string, options?: { replace?: boolean }) => void
): void {
  const restoreStarted = useRef(false);

  useEffect(() => {
    if (!isWorkspaceRootPath(location)) return;
    if (restoreStarted.current) return;

    restoreStarted.current = true;

    void (async () => {
      const store = useBlueprintStore.getState();

      if (store.loadedSystems.length > 0) {
        setIsStartupOpen(false);
        return;
      }

      const restored = await store.restoreWorkspaceSession();
      if (restored) {
        setIsStartupOpen(false);
        setLocation('/workspace/blueprint', { replace: true });
        return;
      }

      const session = loadWorkspaceSession();
      if (session?.mode === 'folder') {
        return;
      }
    })();
  }, [location, setIsStartupOpen, setLocation]);
}
