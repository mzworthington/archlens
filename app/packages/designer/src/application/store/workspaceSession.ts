export type WorkspaceSessionMode = 'sandbox' | 'folder';

export type WorkspaceSession = {
  mode: WorkspaceSessionMode;
  workspaceName?: string;
};

const STORAGE_KEY = 'archlens.workspaceSession';

let memorySession: WorkspaceSession | null = null;

export function saveWorkspaceSession(session: WorkspaceSession): void {
  memorySession = session;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadWorkspaceSession(): WorkspaceSession | null {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WorkspaceSession;
        if (parsed.mode === 'sandbox' || parsed.mode === 'folder') {
          memorySession = parsed;
          return parsed;
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
  }
  return memorySession;
}

export function clearWorkspaceSession(): void {
  memorySession = null;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
