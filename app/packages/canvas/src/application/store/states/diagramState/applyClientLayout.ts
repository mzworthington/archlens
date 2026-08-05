import { hasGroupedLayout } from '@archlens/core/layout';
import {
  mapDomainNodesToRFNodes,
  refreshGroupBoundsFromChildren,
  getNodeDimensions,
  sortNodesForReactFlow,
  layoutGroupedDomainNodes,
  repositionExternalRfNodes,
} from '../../layoutUtils';
import { computeClientLayout } from '../../../layout/computeClientLayout';
import { applyStateUpdates } from './applyStateUpdates';
import type { DiagramStateDeps } from './types';

type SetFn = (partial: Record<string, unknown>) => void;
type GetFn = () => DiagramStateDeps;

export function createApplyClientLayout(set: SetFn, get: GetFn) {
  return async (
    options: {
      signal?: AbortSignal;
      persistToSchema?: boolean;
      recordHistory?: boolean;
      engine?: import('../../../../core').LayoutEngineId;
    } = {}
  ) => {
    const {
      signal,
      persistToSchema = false,
      recordHistory = true,
      engine: engineOverride,
    } = options;
    const { layoutEngine, layoutRegistry, nodes, edges, schema } = get();
    if (!schema?.nodes || !nodes) return;
    if (signal?.aborted) return;

    const grouped = hasGroupedLayout(schema.nodes);
    const engine = engineOverride ?? layoutEngine ?? 'dagre';

    if (grouped) {
      const laidOut = await layoutGroupedDomainNodes(
        schema.nodes,
        schema.dependencies ?? [],
        engine,
        layoutRegistry
      );
      if (signal?.aborted) return;

      const nextNodes = sortNodesForReactFlow(
        refreshGroupBoundsFromChildren(mapDomainNodesToRFNodes(laidOut))
      );
      if (persistToSchema) {
        get().markLayoutCustomized();
      }
      if (recordHistory) {
        get().recordHistory();
      }
      applyStateUpdates(set, get, nextNodes, edges, undefined, undefined, undefined, undefined, {
        syncWorkingCopy: persistToSchema,
      });
      return;
    }

    const packedNodes = refreshGroupBoundsFromChildren(nodes);
    const topLevelNodes = packedNodes.filter(n => !n.parentId);
    const layoutNodes = topLevelNodes.filter(n => !n.data.external);
    const layoutNodeIds = new Set(layoutNodes.map(n => n.id));
    const layoutInput = layoutNodes.map(n => {
      const dims = getNodeDimensions(n);
      return {
        id: n.id,
        measured: n.measured,
        width: dims.width,
        height: dims.height,
      };
    });

    const topLevelEdges = edges.filter(
      e => layoutNodeIds.has(e.source) && layoutNodeIds.has(e.target)
    );

    const positions = await computeClientLayout(engine, layoutInput, topLevelEdges, layoutRegistry);
    if (signal?.aborted) return;

    const laidOutNodes = sortNodesForReactFlow(
      refreshGroupBoundsFromChildren(
        packedNodes.map(n => {
          if (n.parentId || n.data.external) return n;
          const pos = positions.get(n.id);
          return pos ? { ...n, position: pos } : n;
        })
      )
    );

    const nextNodes = repositionExternalRfNodes(laidOutNodes, schema.dependencies ?? []);

    const changed = nextNodes.some(
      (n, i) =>
        n.position.x !== nodes[i]?.position.x ||
        n.position.y !== nodes[i]?.position.y ||
        (n.style as { width?: number })?.width !== (nodes[i]?.style as { width?: number })?.width ||
        (n.style as { height?: number })?.height !==
          (nodes[i]?.style as { height?: number })?.height
    );
    if (!changed) return;
    if (persistToSchema) {
      get().markLayoutCustomized();
    }
    if (recordHistory) {
      get().recordHistory();
    }
    applyStateUpdates(set, get, nextNodes, edges, undefined, undefined, undefined, undefined, {
      syncWorkingCopy: persistToSchema,
    });
  };
}
