import { collectDependencyNeighborhood } from './filterSelectedDependencyFocus';
import { dependencyArrowMarker, getClosestHandles } from '../store/layoutUtils';
import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';

const HIDDEN_EXTERNAL_GHOST_PREFIX = 'external-ghost-';

const GHOST_LAYOUT_RADIUS = 280;

export type HiddenExternalGhostInput = {
  selectedNodeId: string | null | undefined;
  allNodes: BlueprintRFNode[];
  allEdges: BlueprintRFEdge[];
  visibleNodeIds: ReadonlySet<string>;
  enabled: boolean;
};

export type HiddenExternalGhostResult = {
  ghostNodes: BlueprintRFNode[];
  ghostEdges: BlueprintRFEdge[];
};

function nodeCenter(node: BlueprintRFNode): { x: number; y: number } {
  const width = node.measured?.width ?? 256;
  const height = node.measured?.height ?? 120;
  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  };
}

function ghostIdForNode(nodeId: string): string {
  return `${HIDDEN_EXTERNAL_GHOST_PREFIX}${nodeId}`;
}

function isExternalNode(node: BlueprintRFNode | undefined): boolean {
  return node?.data.external === true;
}

function collectHiddenExternalIds(
  allEdges: BlueprintRFEdge[],
  nodeById: Map<string, BlueprintRFNode>,
  closure: ReadonlySet<string>,
  visibleNodeIds: ReadonlySet<string>
): Set<string> {
  const hiddenExternalIds = new Set<string>();

  for (const edge of allEdges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) continue;

    const sourceInClosure = closure.has(edge.source);
    const targetInClosure = closure.has(edge.target);
    const sourceHiddenExternal = isExternalNode(source) && !visibleNodeIds.has(edge.source);
    const targetHiddenExternal = isExternalNode(target) && !visibleNodeIds.has(edge.target);

    if (sourceInClosure && targetHiddenExternal) hiddenExternalIds.add(edge.target);
    if (targetInClosure && sourceHiddenExternal) hiddenExternalIds.add(edge.source);
  }

  return hiddenExternalIds;
}

function buildGhostNodes(
  hiddenIds: readonly string[],
  nodeById: Map<string, BlueprintRFNode>,
  selected: BlueprintRFNode
): BlueprintRFNode[] {
  const center = nodeCenter(selected);
  return hiddenIds.map((nodeId, index) => {
    const original = nodeById.get(nodeId)!;
    const angle = (2 * Math.PI * index) / hiddenIds.length - Math.PI / 2;
    const x = center.x + GHOST_LAYOUT_RADIUS * Math.cos(angle) - 128;
    const y = center.y + GHOST_LAYOUT_RADIUS * Math.sin(angle) - 60;
    return {
      id: ghostIdForNode(nodeId),
      type: 'blueprintNode',
      position: { x, y },
      data: {
        ...original.data,
        id: ghostIdForNode(nodeId),
        hiddenExternalGhost: true,
        hiddenExternalGhostPosition: { x, y },
        hiddenExternalSourceId: nodeId,
      },
      selectable: false,
      draggable: false,
    };
  });
}

function resolveGhostEdgeEndpoints(
  edge: BlueprintRFEdge,
  closure: ReadonlySet<string>,
  visibleNodeIds: ReadonlySet<string>,
  ghostNodeBySourceId: Map<string, BlueprintRFNode>
): { visibleSourceId: string; visibleTargetId: string } | null {
  let visibleSourceId: string | null = null;
  let visibleTargetId: string | null = null;

  if (closure.has(edge.source) && visibleNodeIds.has(edge.source)) {
    visibleSourceId = edge.source;
  }
  if (closure.has(edge.target) && visibleNodeIds.has(edge.target)) {
    visibleTargetId = edge.target;
  }

  const sourceGhost = ghostNodeBySourceId.get(edge.source);
  const targetGhost = ghostNodeBySourceId.get(edge.target);
  if (sourceGhost) visibleSourceId = sourceGhost.id;
  if (targetGhost) visibleTargetId = targetGhost.id;

  if (!visibleSourceId || !visibleTargetId) return null;
  if (!sourceGhost && !targetGhost) return null;
  return { visibleSourceId, visibleTargetId };
}

function buildGhostEdges(
  allEdges: BlueprintRFEdge[],
  nodeById: Map<string, BlueprintRFNode>,
  closure: ReadonlySet<string>,
  visibleNodeIds: ReadonlySet<string>,
  ghostNodes: BlueprintRFNode[],
  allNodes: BlueprintRFNode[]
): BlueprintRFEdge[] {
  const ghostNodeBySourceId = new Map(
    ghostNodes.map(node => [node.data.hiddenExternalSourceId as string, node])
  );
  const renderNodes = [...allNodes.filter(node => visibleNodeIds.has(node.id)), ...ghostNodes];
  const ghostEdges: BlueprintRFEdge[] = [];

  for (const edge of allEdges) {
    if (!nodeById.get(edge.source) || !nodeById.get(edge.target)) continue;

    const endpoints = resolveGhostEdgeEndpoints(edge, closure, visibleNodeIds, ghostNodeBySourceId);
    if (!endpoints) continue;

    const sourceNode = renderNodes.find(node => node.id === endpoints.visibleSourceId);
    const targetNode = renderNodes.find(node => node.id === endpoints.visibleTargetId);
    if (!sourceNode || !targetNode) continue;

    const handles = getClosestHandles(sourceNode, targetNode, renderNodes);
    ghostEdges.push({
      ...edge,
      id: edge.id,
      source: endpoints.visibleSourceId,
      target: endpoints.visibleTargetId,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      animated: false,
      markerEnd: dependencyArrowMarker('#22d3ee'),
      data: {
        type: edge.data?.type ?? 'direct-call',
        description: edge.data?.description ?? '',
        hiddenExternalGhost: true,
      },
      style: {
        stroke: '#22d3ee',
        strokeWidth: 2,
        strokeDasharray: '6 4',
        opacity: 0.85,
      },
    });
  }

  return ghostEdges;
}

/**
 * Ephemeral ghost nodes and dashed edges for cross-diagram externals that are
 * connected to the dependency focus closure but hidden from the canvas.
 */
export function buildHiddenExternalConnectionGhosts({
  selectedNodeId,
  allNodes,
  allEdges,
  visibleNodeIds,
  enabled,
}: HiddenExternalGhostInput): HiddenExternalGhostResult {
  if (!enabled || !selectedNodeId) {
    return { ghostNodes: [], ghostEdges: [] };
  }

  const nodeById = new Map(allNodes.map(node => [node.id, node]));
  const selected = nodeById.get(selectedNodeId);
  if (!selected) return { ghostNodes: [], ghostEdges: [] };

  const closure = collectDependencyNeighborhood(selectedNodeId, allNodes, allEdges);
  const hiddenExternalIds = collectHiddenExternalIds(allEdges, nodeById, closure, visibleNodeIds);
  if (hiddenExternalIds.size === 0) {
    return { ghostNodes: [], ghostEdges: [] };
  }

  const ghostNodes = buildGhostNodes([...hiddenExternalIds], nodeById, selected);
  const ghostEdges = buildGhostEdges(
    allEdges,
    nodeById,
    closure,
    visibleNodeIds,
    ghostNodes,
    allNodes
  );

  return { ghostNodes, ghostEdges };
}
