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
  selectedRfNode: BlueprintRFNode | undefined,
  selectedNodeId?: string | null
): SystemNode | null {
  if (selectedRfNode) {
    const rfId = selectedRfNode.id;
    const rfRef = selectedRfNode.data.entityRef;
    const match = schema.nodes.find(
      node =>
        node.entityRef === rfRef ||
        node.entityRef === rfId ||
        (node.entityRef && rfId.endsWith('/' + node.entityRef)) ||
        (node.entityRef && rfRef?.endsWith('/' + node.entityRef)) ||
        (node.entityRef && node.entityRef.endsWith('/' + rfId))
    );
    if (match) return match;
  }
  if (!selectedNodeId) return null;
  return (
    schema.nodes.find(
      node =>
        node.entityRef === selectedNodeId ||
        node.entityRef?.endsWith('/' + selectedNodeId) ||
        selectedNodeId.endsWith('/' + node.entityRef)
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
