import {
  beginDiagramLoad,
  DIAGRAM_LOADING_MESSAGE,
  endDiagramLoad,
} from '../../diagramLoadSession';
import { yieldToUi } from '../../yieldToUi';
import { ensureSystemLoaded } from '../ioState/ensureSystemLoaded';
import type { DiagramStateDeps } from './types';
import type { BlueprintStoreSet } from '../../store';

type SetFn = BlueprintStoreSet;
type GetFn = () => DiagramStateDeps;

export function createSelectSystem(set: SetFn, get: GetFn) {
  return async (path: string) => {
    if (get().systemSelectInFlight === path) return;

    set({ systemSelectInFlight: path });
    const { logger, workspacePort, sampleWorkspacePort, workingCopyPort, isSampleWorkspace } =
      get();
    // Sample workspace always reads from the injected sample adapter - never the
    // folder picker port (StrictMode / setPorts races can otherwise leave the wrong port).
    const activeWorkspacePort = isSampleWorkspace ? sampleWorkspacePort : workspacePort;
    beginDiagramLoad(get, set, DIAGRAM_LOADING_MESSAGE);
    await yieldToUi();

    const previousPath = get().currentFilePath;

    const showInsideRoom = () => {
      set({
        currentFilePath: path,
        selectedNodeId: null,
        selectedEdgeId: null,
        focusedCyclePath: null,
      });
      get().clearHistory();
      logger.info('Switching active system inside the live room', { path });
    };

    const reloadComments = async () => {
      if (previousPath === path || !get().isWorkspaceOpen || get().isSampleWorkspace) return;
      await get().loadPersistedComments(path);
      if (get().currentFilePath !== path || !get().collabSessionPort.isActive()) return;
      get().collabSessionPort.seedComments(get().persistedComments);
    };

    // Publish the path before focus emits comments, so those rows bind to this file.
    const focusLiveDiagram = (schema: DiagramStateDeps['schema'] | undefined): boolean => {
      set({ currentFilePath: path });
      const focused = get().collabSessionPort.focusDiagram(path, schema);
      if (!focused) set({ currentFilePath: previousPath });
      return focused;
    };

    try {
      const collab = get().collabSessionPort;
      if (collab.isActive()) {
        const known = get().loadedSystems.find(s => s.path === path);
        if (focusLiveDiagram(known?.schema)) {
          showInsideRoom();
          await reloadComments();
          return;
        }
      }

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
      if (get().collabSessionPort.isActive() && focusLiveDiagram(system.schema)) {
        showInsideRoom();
        await reloadComments();
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
      const commentsReady = reloadComments();
      await yieldToUi();
      get().initSchema(system.schema);
      await commentsReady;
    } finally {
      endDiagramLoad(get, set);
      if (get().systemSelectInFlight === path) {
        set({ systemSelectInFlight: null });
      }
    }
  };
}
