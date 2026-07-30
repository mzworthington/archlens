import { useEffect, useRef } from 'react';
import { useBlueprintStore } from '../../../../application/store/store';
import { loadWorkspaceSession } from '../../../../application/store/workspaceSession';

function isWorkspaceRootPath(location: string): boolean {
  return location === '/workspace' || location === '/workspace/';
}

/**
 * On bare `/workspace`, auto-load the bundled sandbox for first-time visitors.
 * Folder sessions require a new picker gesture — keep the startup chooser open.
 */
export function useAutoLoadWorkspace(
  location: string,
  setIsStartupOpen: (open: boolean) => void,
  setLocation: (path: string, options?: { replace?: boolean }) => void
): void {
  const autoLoadStarted = useRef(false);

  useEffect(() => {
    if (!isWorkspaceRootPath(location)) return;
    if (autoLoadStarted.current) return;

    autoLoadStarted.current = true;

    void (async () => {
      const store = useBlueprintStore.getState();

      if (store.loadedSystems.length > 0) {
        setIsStartupOpen(false);
        return;
      }

      await store.restoreWorkspaceSession();

      const afterRestore = useBlueprintStore.getState();
      if (afterRestore.loadedSystems.length > 0) {
        setIsStartupOpen(false);
        setLocation('/workspace/blueprint', { replace: true });
        return;
      }

      const session = loadWorkspaceSession();
      if (session?.mode === 'folder') {
        return;
      }

      await afterRestore.loadBundledSandbox();
      setIsStartupOpen(false);
      setLocation('/workspace/blueprint', { replace: true });
    })();
  }, [location, setIsStartupOpen, setLocation]);
}
