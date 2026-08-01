import {
  beginDiagramLoad,
  DIAGRAM_LOADING_MESSAGE,
  endDiagramLoad,
} from '../../diagramLoadSession';
import { yieldToUi } from '../../yieldToUi';
import { ensureSystemLoaded } from '../ioState/ensureSystemLoaded';
import type { DiagramStateDeps } from './types';

type SetFn = (partial: Record<string, unknown>) => void;
type GetFn = () => DiagramStateDeps;

export function createSelectSystem(set: SetFn, get: GetFn) {
  return async (path: string) => {
    if (get().systemSelectInFlight === path) return;

    set({ systemSelectInFlight: path });
    const { logger, workspacePort, sampleWorkspacePort, workingCopyPort, isSampleWorkspace } =
      get();
    // Sample workspace always reads from the injected sample adapter — never the
    // folder picker port (StrictMode / setPorts races can otherwise leave the wrong port).
    const activeWorkspacePort = isSampleWorkspace ? sampleWorkspacePort : workspacePort;
    beginDiagramLoad(get, set, DIAGRAM_LOADING_MESSAGE);
    await yieldToUi();

    try {
      if (!get().loadedSystems.some(s => s.path === path)) {
        const ok = await ensureSystemLoaded(path, {
          workspacePort: activeWorkspacePort,
          workingCopyPort,
          logger,
          get,
          set,
        });
        if (!ok) {
          logger.warn('System path not found in workspace', { path });
          return;
        }
      }

      const system = get().loadedSystems.find(s => s.path === path);
      if (!system) {
        logger.warn('System path not found in loaded systems', { path });
        return;
      }
      logger.info('Switching active system', { name: system.name, path });
      set({
        currentFilePath: path,
        selectedNodeId: null,
        selectedEdgeId: null,
        focusedCyclePath: null,
      });
      get().clearHistory();
      await yieldToUi();
      get().initSchema(system.schema);
    } finally {
      endDiagramLoad(get, set);
      if (get().systemSelectInFlight === path) {
        set({ systemSelectInFlight: null });
      }
    }
  };
}
