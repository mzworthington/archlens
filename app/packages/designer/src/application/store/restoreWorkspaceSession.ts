import { loadWorkspaceSession } from './workspaceSession';
import { resumeBundledSandbox } from './states/diagramState/loadBundledSandbox';

type RestoreGet = () => {
  loadedSystems: unknown[];
  isWorkspaceOpen: boolean;
};

type RestoreSet = Parameters<typeof resumeBundledSandbox>[0];

/**
 * Rehydrate the in-memory workspace after a full page reload.
 * IndexedDB stores per-diagram drafts; this restores which workspace mode was active.
 */
export async function restoreWorkspaceSession(get: RestoreGet, set: RestoreSet): Promise<boolean> {
  if (get().loadedSystems.length > 0 || get().isWorkspaceOpen) return false;

  const session = loadWorkspaceSession();
  if (!session) return false;

  if (session.mode === 'sandbox') {
    await resumeBundledSandbox(set, get as Parameters<typeof resumeBundledSandbox>[1]);
    return true;
  }

  // Folder handles cannot be restored without a new user gesture.
  return false;
}
