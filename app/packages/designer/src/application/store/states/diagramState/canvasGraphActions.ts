import { refreshGroupBoundsFromChildren, isDesktopViewport } from '../../layoutUtils';
import { applyStateUpdates } from './applyStateUpdates';
import { addNodeMutation, updateNodeMutation, deleteNodeMutation } from './nodeMutations';
import {
  connectNodesMutation,
  updateDependencyMutation,
  deleteDependencyMutation,
} from './edgeMutations';
import type { CanvasNodeChange, CanvasEdgeChange, CanvasConnection } from '../../../../core';
import type { SystemNode, SystemDependency, NodeType } from '@archlens/core';
import type { DiagramStateDeps, SelectionOptions } from './types';

type SetFn = (partial: Record<string, unknown>) => void;
type GetFn = () => DiagramStateDeps;

function shouldExpandPropertyPanel(hasSelection: boolean, options?: SelectionOptions): boolean {
  if (!hasSelection) return false;
  if (options?.expandPanel) return true;
  return isDesktopViewport();
}

export function createCanvasGraphActions(set: SetFn, get: GetFn) {
  return {
    onNodesChange: (changes: CanvasNodeChange[]) => {
      const hasRemoval = changes.some(c => c.type === 'remove');
      if (hasRemoval) {
        get().recordHistory();
      }
      const finishedDrag = changes.some(
        c => c.type === 'position' && 'dragging' in c && c.dragging === false
      );
      if (finishedDrag) {
        get().markLayoutCustomized();
      }
      let nextNodes = get().graphChangePort.applyNodeChanges(changes, get().nodes);
      if (changes.some(c => c.type === 'dimensions')) {
        nextNodes = refreshGroupBoundsFromChildren(nextNodes);
      }
      applyStateUpdates(set, get, nextNodes, get().edges);
    },

    onEdgesChange: (changes: CanvasEdgeChange[]) => {
      // Coupling overlays are display-only (id prefix `coupling-`) and must not mutate schema edges.
      const persistedChanges = changes.filter(
        change => !('id' in change) || !String(change.id).startsWith('coupling-')
      );
      if (persistedChanges.length === 0) return;
      const hasRemoval = persistedChanges.some(c => c.type === 'remove');
      if (hasRemoval) {
        get().recordHistory();
      }
      const nextEdges = get().graphChangePort.applyEdgeChanges(persistedChanges, get().edges);
      applyStateUpdates(set, get, get().nodes, nextEdges);
    },

    onConnect: (connection: CanvasConnection) => {
      get().recordHistory();
      connectNodesMutation(set, get, connection);
    },

    addNode: (type: NodeType, position?: { x: number; y: number }) => {
      get().recordHistory();
      addNodeMutation(set, get, type, position);
    },

    updateNode: (id: string, updates: Partial<SystemNode>) => {
      get().recordHistory();
      updateNodeMutation(set, get, id, updates);
    },

    deleteNode: (id: string) => {
      get().recordHistory();
      deleteNodeMutation(set, get, id);
    },

    selectNode: (id: string | null, options?: SelectionOptions) => {
      const expandPanel = shouldExpandPropertyPanel(id !== null, options);
      set({
        selectedNodeId: id,
        selectedEdgeId: id ? null : get().selectedEdgeId,
        rightCollapsed: expandPanel ? false : get().rightCollapsed,
      });
    },

    selectEdge: (id: string | null, options?: SelectionOptions) => {
      const expandPanel = shouldExpandPropertyPanel(id !== null, options);
      set({
        selectedEdgeId: id,
        selectedNodeId: id ? null : get().selectedNodeId,
        rightCollapsed: expandPanel ? false : get().rightCollapsed,
      });
    },

    updateDependency: (from: string, to: string, updates: Partial<SystemDependency>) => {
      get().recordHistory();
      updateDependencyMutation(set, get, from, to, updates);
    },

    deleteDependency: (from: string, to: string) => {
      get().recordHistory();
      const { selectedEdgeId, edges } = get();
      const selected = edges.find(e => e.id === selectedEdgeId);
      deleteDependencyMutation(set, get, from, to);
      if (selected && selected.source === from && selected.target === to) {
        set({ selectedEdgeId: null });
      }
    },
  };
}
