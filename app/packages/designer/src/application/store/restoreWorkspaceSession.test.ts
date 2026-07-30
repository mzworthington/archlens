import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveWorkspaceSession, clearWorkspaceSession } from './workspaceSession';
import { restoreWorkspaceSession } from './restoreWorkspaceSession';

describe('restoreWorkspaceSession', () => {
  beforeEach(() => {
    clearWorkspaceSession();
  });

  it('resumes sandbox when session exists and store is empty', async () => {
    saveWorkspaceSession({ mode: 'sandbox' });
    const initSchema = vi.fn();
    const set = vi.fn();
    const get = vi.fn(() => ({
      loadedSystems: [] as Array<{ path: string; name: string; schema: unknown }>,
      isWorkspaceOpen: false,
      workspaceCatalog: [],
      initSchema,
      clearHistory: vi.fn(),
      diagramLoadCount: 0,
      isLoading: false,
      systemSelectInFlight: null as string | null,
      workspaceName: '',
      workingCopyPort: undefined,
      logger: { warn: vi.fn() },
      workspacePort: undefined,
      nodeRefMap: {},
    }));

    const restored = await restoreWorkspaceSession(get, set);

    expect(restored).toBe(true);
    expect(set).toHaveBeenCalled();
    expect(initSchema).toHaveBeenCalled();
  });

  it('skips restore when diagrams are already loaded', async () => {
    saveWorkspaceSession({ mode: 'sandbox' });
    const restored = await restoreWorkspaceSession(
      () => ({ loadedSystems: [{ path: 'a.yaml' }], isWorkspaceOpen: false }),
      vi.fn()
    );

    expect(restored).toBe(false);
  });

  it('does not auto-restore folder workspaces', async () => {
    saveWorkspaceSession({ mode: 'folder', workspaceName: 'my-folder' });
    const restored = await restoreWorkspaceSession(
      () => ({ loadedSystems: [], isWorkspaceOpen: false }),
      vi.fn()
    );

    expect(restored).toBe(false);
  });

  it('deduplicates concurrent sandbox restore calls', async () => {
    saveWorkspaceSession({ mode: 'sandbox' });
    const initSchema = vi.fn();
    const set = vi.fn();
    const get = vi.fn(() => ({
      loadedSystems: [] as Array<{ path: string; name: string; schema: unknown }>,
      isWorkspaceOpen: false,
      workspaceCatalog: [],
      initSchema,
      clearHistory: vi.fn(),
      diagramLoadCount: 0,
      isLoading: false,
      systemSelectInFlight: null as string | null,
      workspaceName: '',
      workingCopyPort: undefined,
      logger: { warn: vi.fn() },
      workspacePort: undefined,
      nodeRefMap: {},
    }));

    await Promise.all([restoreWorkspaceSession(get, set), restoreWorkspaceSession(get, set)]);

    expect(initSchema).toHaveBeenCalledTimes(1);
  });
});
