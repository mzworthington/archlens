import {
  refreshGroupBoundsFromChildren,
  resolveDragGroupMembership,
  isDesktopViewport,
} from '../../layoutUtils';
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
import type { BlueprintStoreSet } from '../../store';

type SetFn = BlueprintStoreSet;
type GetFn = () => DiagramStateDeps;

function shouldExpandPropertyPanel(hasSelection: boolean, options?: SelectionOptions): boolean {
  if (!hasSelection) return false;
  if (options?.expandPanel) return true;
  return isDesktopViewport();
}

export function createCanvasGraphActions(set: SetFn, get: GetFn) {
  return {
    onNodesChange: (changes: CanvasNodeChange[]) => {
      const isLayoutMeasureOnly = changes.every(
        c => c.type === 'dimensions' || c.type === 'select'
      );
      if (isLayoutMeasureOnly) {
        let nextNodes = get().graphChangePort.applyNodeChanges(changes, get().nodes);
        if (changes.some(c => c.type === 'dimensions')) {
          nextNodes = refreshGroupBoundsFromChildren(nextNodes);
        }
        set({ nodes: nextNodes });
        return;
      }

      const hasRemoval = changes.some(c => c.type === 'remove');
      if (hasRemoval) {
        get().recordHistory();
      }
      const finishedDragChanges = changes.filter(
        c =>
          c.type === 'position' &&
          'dragging' in c &&
          c.dragging === false &&
          typeof c.id === 'string'
      );
      const finishedDrag = finishedDragChanges.length > 0;
      if (finishedDrag) {
        get().markLayoutCustomized();
      }
      let nextNodes = get().graphChangePort.applyNodeChanges(changes, get().nodes);
      if (finishedDrag) {
        const draggedIds = finishedDragChanges.map(c => c.id as string);
        nextNodes = resolveDragGroupMembership(nextNodes, draggedIds);
      }
      if (changes.some(c => c.type === 'dimensions')) {
        nextNodes = refreshGroupBoundsFromChildren(nextNodes);
      }
      applyStateUpdates(set, get, nextNodes, get().edges);
    },

    onEdgesChange: (changes: CanvasEdgeChange[]) => {
      // Coupling overlays are display-only (id prefix `coupling-`) and must not mutate schema edges.
      const persistedChanges = changes.filter(change => {
        if (!('id' in change)) return true;
        const edgeId = String(change.id);
        return !edgeId.startsWith('coupling-') && !edgeId.startsWith('external-summary-');
      });
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
      let resolvedId = id;
      if (id !== null) {
        const matchingNode = get().nodes.find(n => n.id === id || n.data?.entityRef === id);
        if (matchingNode) {
          resolvedId = matchingNode.id;
        }
      }
      const expandPanel = shouldExpandPropertyPanel(resolvedId !== null, options);
      const dependencyViewMode = resolvedId
        ? get().dependencyViewMode === 'full'
          ? 'focus'
          : get().dependencyViewMode
        : 'full';
      set({
        selectedNodeId: resolvedId,
        selectedEdgeId: resolvedId ? null : get().selectedEdgeId,
        rightCollapsed: expandPanel ? false : get().rightCollapsed,
        dependencyViewMode,
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
