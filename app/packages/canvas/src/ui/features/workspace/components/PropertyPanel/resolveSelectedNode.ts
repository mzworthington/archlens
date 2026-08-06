import type { SystemNode, SystemSchema } from '@archlens/core';
import type {
  BlueprintRFEdge,
  BlueprintRFNode,
} from '../../../../../application/store/layoutUtils';

export function resolveSelectedRfNode(
  nodes: readonly BlueprintRFNode[],
  selectedNodeId: string | null
): BlueprintRFNode | undefined {
  if (!selectedNodeId) return undefined;
  return nodes.find(node => node.id === selectedNodeId || node.data.entityRef === selectedNodeId);
}

export function resolveSelectedSchemaNode(
  schema: SystemSchema,
  selectedRfNode: BlueprintRFNode | undefined
): SystemNode | null {
  if (!selectedRfNode) return null;
  return (
    schema.nodes.find(
      node =>
        node.entityRef === selectedRfNode.data.entityRef ||
        node.entityRef?.endsWith('/' + selectedRfNode.id)
    ) ?? null
  );
}

export function findSelectedEdge(
  edges: readonly BlueprintRFEdge[],
  selectedEdgeId: string | null
): BlueprintRFEdge | null {
  if (!selectedEdgeId) return null;
  return edges.find(edge => edge.id === selectedEdgeId) ?? null;
}

export function isEdgeEndpointMissing(
  nodes: readonly BlueprintRFNode[],
  selectedEdge: BlueprintRFEdge | null
): boolean {
  if (!selectedEdge) return false;
  return (
    !nodes.some(node => node.id === selectedEdge.source) ||
    !nodes.some(node => node.id === selectedEdge.target)
  );
}
