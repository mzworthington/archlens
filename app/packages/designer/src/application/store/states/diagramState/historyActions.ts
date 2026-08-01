import { applyStateUpdates } from './applyStateUpdates';
import type { DiagramStateDeps } from './types';

type SetFn = (partial: Record<string, unknown>) => void;
type GetFn = () => DiagramStateDeps;

export function createHistoryActions(set: SetFn, get: GetFn) {
  return {
    recordHistory: () => {
      const { nodes, edges, schema } = get();
      const snapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        schema: JSON.parse(JSON.stringify(schema)),
      };
      set({
        past: [...get().past, snapshot].slice(-50),
        future: [],
      });
    },

    undo: () => {
      const { past, future, nodes, edges, schema } = get();
      if (past.length === 0) return;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      const currentSnapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        schema: JSON.parse(JSON.stringify(schema)),
      };

      set({
        past: newPast,
        future: [currentSnapshot, ...future],
      });

      applyStateUpdates(set, get, previous.nodes, previous.edges);
    },

    redo: () => {
      const { past, future, nodes, edges, schema } = get();
      if (future.length === 0) return;

      const next = future[0];
      const newFuture = future.slice(1);
      const currentSnapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        schema: JSON.parse(JSON.stringify(schema)),
      };

      set({
        past: [...past, currentSnapshot],
        future: newFuture,
      });

      applyStateUpdates(set, get, next.nodes, next.edges);
    },

    clearHistory: () => {
      set({
        past: [],
        future: [],
      });
    },
  };
}
