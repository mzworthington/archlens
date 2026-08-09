import type { SystemSchema } from '@archlens/core';
import { classifyExternalNodeDirection } from '@archlens/core';
import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';

export type ExternalNodeDirection = {
  /** External node calls into the diagram (incoming dependency). */
  upstream: boolean;
  /** Diagram calls into the external node (outgoing dependency). */
  downstream: boolean;
};

function isInternalCanvasNode(nodes: BlueprintRFNode[], nodeId: string): boolean {
  const node = nodes.find(entry => entry.id === nodeId);
  return !!node && !node.data.external;
}

/**
 * Classify an external node using live canvas edges (matches dependency-focus direction).
 */
function classifyExternalNodeFromCanvas(
  entityRef: string,
  nodes: BlueprintRFNode[],
  edges: BlueprintRFEdge[]
): ExternalNodeDirection {
  let upstream = false;
  let downstream = false;

  for (const edge of edges) {
    if (edge.source === entityRef && isInternalCanvasNode(nodes, edge.target)) {
      upstream = true;
    }
    if (edge.target === entityRef && isInternalCanvasNode(nodes, edge.source)) {
      downstream = true;
    }
  }

  return { upstream, downstream };
}

export function shouldShowExternalNode(
  direction: ExternalNodeDirection,
  showUpstreamExternals: boolean,
  showDownstreamExternals: boolean
): boolean {
  if (!showUpstreamExternals && !showDownstreamExternals) return false;
  if (!direction.upstream && !direction.downstream) {
    return showUpstreamExternals || showDownstreamExternals;
  }
  if (direction.upstream && showUpstreamExternals) return true;
  if (direction.downstream && showDownstreamExternals) return true;
  return false;
}

export function shouldShowCanvasExternalNode(
  entityRef: string,
  nodes: BlueprintRFNode[],
  edges: BlueprintRFEdge[],
  showUpstreamExternals: boolean,
  showDownstreamExternals: boolean
): boolean {
  return shouldShowExternalNode(
    classifyExternalNodeFromCanvas(entityRef, nodes, edges),
    showUpstreamExternals,
    showDownstreamExternals
  );
}

export function classifyExternalNode(
  entityRef: string,
  schema: SystemSchema
): ExternalNodeDirection {
  return classifyExternalNodeDirection(entityRef, schema.nodes, schema.dependencies ?? []);
}

export function isExternalNodeVisible(
  entityRef: string,
  schema: SystemSchema,
  showUpstreamExternals: boolean,
  showDownstreamExternals: boolean
): boolean {
  const node = schema.nodes.find(
    n => n.entityRef === entityRef || n.entityRef.endsWith('/' + entityRef)
  );
  if (!node?.external) return true;
  // C4 context diagrams always surface external dependencies alongside actors.
  if (schema.level === 'context') return true;
  return shouldShowExternalNode(
    classifyExternalNode(entityRef, schema),
    showUpstreamExternals,
    showDownstreamExternals
  );
}

export function countExternalNodesByDirection(
  schema: SystemSchema,
  entityRefs?: Iterable<string>
): { upstream: number; downstream: number } {
  const allowed =
    entityRefs == null ? null : entityRefs instanceof Set ? entityRefs : new Set(entityRefs);

  let upstream = 0;
  let downstream = 0;

  for (const node of schema.nodes) {
    if (!node.external || !node.entityRef) continue;
    if (allowed && !allowed.has(node.entityRef)) continue;

    const direction = classifyExternalNode(node.entityRef, schema);
    if (direction.upstream) upstream++;
    if (direction.downstream) downstream++;
    if (!direction.upstream && !direction.downstream) {
      upstream++;
      downstream++;
    }
  }

  return { upstream, downstream };
}
