import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import type {
  BlueprintRFEdge,
  BlueprintRFNode,
} from '../../../../../application/store/layoutUtils';

function centerOnEdge(
  reactFlow: ReturnType<typeof useReactFlow>,
  edge: BlueprintRFEdge,
  nodes: BlueprintRFNode[],
  attempt = 0
): void {
  const source = nodes.find(node => node.id === edge.source);
  const target = nodes.find(node => node.id === edge.target);
  if (!source || !target) {
    if (attempt < 24) {
      window.setTimeout(() => centerOnEdge(reactFlow, edge, nodes, attempt + 1), 50);
    }
    return;
  }

  try {
    void reactFlow.fitView({
      nodes: [{ id: source.id }, { id: target.id }],
      duration: 600,
      padding: 0.35,
      maxZoom: 1.2,
    });
  } catch {
    // ReactFlow may be unavailable in tests.
  }
}

/** Pans/zooms the canvas when a connection is spotlighted from the property panel. */
export function useSpotlightEdge(
  selectedEdgeId: string | null,
  displayEdges: BlueprintRFEdge[],
  displayNodes: BlueprintRFNode[]
): void {
  const reactFlow = useReactFlow();

  useEffect(() => {
    if (!selectedEdgeId) return;
    const edge = displayEdges.find(entry => entry.id === selectedEdgeId);
    if (!edge) return;
    centerOnEdge(reactFlow, edge, displayNodes);
  }, [selectedEdgeId, displayEdges, displayNodes, reactFlow]);
}
