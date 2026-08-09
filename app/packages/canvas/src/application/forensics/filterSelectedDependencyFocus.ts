import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';

function isGroupNode(id: string, nodes: BlueprintRFNode[]): boolean {
  const node = nodes.find(n => n.id === id);
  return node?.type === 'blueprintGroup' || node?.data?.type === 'group';
}

function childrenOfGroup(parentId: string, nodes: BlueprintRFNode[]): string[] {
  return nodes.filter(n => n.parentId === parentId).map(n => n.id);
}

/** Expand a group ref to its children; empty groups stay as the group ref. */
function expandGroupEndpoints(id: string, nodes: BlueprintRFNode[]): string[] {
  if (!isGroupNode(id, nodes)) return [id];
  const children = childrenOfGroup(id, nodes);
  return children.length > 0 ? children : [id];
}

function buildAdjacency(nodes: BlueprintRFNode[], edges: BlueprintRFEdge[], nodeIds: Set<string>) {
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const edge of edges) {
    const sources = expandGroupEndpoints(edge.source, nodes);
    const targets = expandGroupEndpoints(edge.target, nodes);

    for (const source of sources) {
      if (!nodeIds.has(source)) continue;
      for (const target of targets) {
        if (!nodeIds.has(target)) continue;
        const outList = outgoing.get(source);
        if (outList) outList.push(target);
        else outgoing.set(source, [target]);
        const inList = incoming.get(target);
        if (inList) inList.push(source);
        else incoming.set(target, [source]);
      }
    }
  }
  return { outgoing, incoming };
}

function walkClosure(
  startId: string,
  adjacency: Map<string, string[]>,
  nodes: BlueprintRFNode[]
): Set<string> {
  const visited = new Set<string>();
  const stack = [startId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    if (isExternalCanvasNode(id, nodes) && id !== startId) continue;
    visited.add(id);
    for (const next of adjacency.get(id) ?? []) {
      if (visited.has(next)) continue;
      if (isExternalCanvasNode(next, nodes) && next !== startId) continue;
      stack.push(next);
    }
  }
  return visited;
}

function isExternalCanvasNode(id: string, nodes: BlueprintRFNode[]): boolean {
  return nodes.find(n => n.id === id)?.data.external === true;
}

function walkClosureWithHops(
  startId: string,
  adjacency: Map<string, string[]>,
  nodes: BlueprintRFNode[]
): Map<string, number> {
  const hops = new Map<string, number>();
  const queue: Array<{ id: string; hop: number }> = [{ id: startId, hop: 0 }];
  while (queue.length > 0) {
    const { id, hop } = queue.shift()!;
    if (hops.has(id)) continue;
    if (isExternalCanvasNode(id, nodes) && id !== startId) continue;
    hops.set(id, hop);
    for (const next of adjacency.get(id) ?? []) {
      if (hops.has(next)) continue;
      if (isExternalCanvasNode(next, nodes) && next !== startId) continue;
      queue.push({ id: next, hop: hop + 1 });
    }
  }
  return hops;
}

function nodeLabel(nodes: BlueprintRFNode[], id: string): string {
  const node = nodes.find(n => n.id === id);
  return node?.data?.name ?? id;
}

const MAX_DEPENDENCY_GRAPH_PEERS = 6;

export type DependencyGraphPeer = {
  entityRef: string;
  name: string;
  hop: number;
};

export type DependencyGraphModel = {
  upstream: DependencyGraphPeer[];
  downstream: DependencyGraphPeer[];
  upstreamTotal: number;
  downstreamTotal: number;
};

function peersFromHops(
  hops: Map<string, number>,
  selectedNodeId: string,
  nodes: BlueprintRFNode[]
): DependencyGraphPeer[] {
  return [...hops.entries()]
    .filter(([id]) => id !== selectedNodeId)
    .map(([entityRef, hop]) => ({
      entityRef,
      name: nodeLabel(nodes, entityRef),
      hop,
    }))
    .sort((a, b) => a.hop - b.hop || a.name.localeCompare(b.name));
}

/** Collect transitive upstream callers (incoming edges only). Display-only. */
export function collectUpstreamNeighborhood(
  selectedNodeId: string | null | undefined,
  nodes: BlueprintRFNode[],
  edges: BlueprintRFEdge[]
): Set<string> {
  if (!selectedNodeId) return new Set<string>();
  const nodeIds = new Set(nodes.map(n => n.id));
  if (!nodeIds.has(selectedNodeId)) return new Set<string>();
  const { incoming } = buildAdjacency(nodes, edges, nodeIds);
  return expandGroupVisibility(walkClosure(selectedNodeId, incoming, nodes), nodes);
}

/** Collect transitive downstream targets (outgoing edges only). Display-only. */
export function collectDownstreamNeighborhood(
  selectedNodeId: string | null | undefined,
  nodes: BlueprintRFNode[],
  edges: BlueprintRFEdge[]
): Set<string> {
  if (!selectedNodeId) return new Set<string>();
  const nodeIds = new Set(nodes.map(n => n.id));
  if (!nodeIds.has(selectedNodeId)) return new Set<string>();
  const { outgoing } = buildAdjacency(nodes, edges, nodeIds);
  return expandGroupVisibility(walkClosure(selectedNodeId, outgoing, nodes), nodes);
}

/**
 * Build upstream/downstream peer lists with hop distance from the selection.
 * Display-only; does not mutate schema.
 */
export function buildDependencyGraphModel(
  selectedNodeId: string | null | undefined,
  nodes: BlueprintRFNode[],
  edges: BlueprintRFEdge[]
): DependencyGraphModel {
  if (!selectedNodeId) {
    return { upstream: [], downstream: [], upstreamTotal: 0, downstreamTotal: 0 };
  }
  const nodeIds = new Set(nodes.map(n => n.id));
  if (!nodeIds.has(selectedNodeId)) {
    return { upstream: [], downstream: [], upstreamTotal: 0, downstreamTotal: 0 };
  }

  const { outgoing, incoming } = buildAdjacency(nodes, edges, nodeIds);
  const upstreamAll = peersFromHops(
    walkClosureWithHops(selectedNodeId, incoming, nodes),
    selectedNodeId,
    nodes
  );
  const downstreamAll = peersFromHops(
    walkClosureWithHops(selectedNodeId, outgoing, nodes),
    selectedNodeId,
    nodes
  );

  return {
    upstream: upstreamAll.slice(0, MAX_DEPENDENCY_GRAPH_PEERS),
    downstream: downstreamAll.slice(0, MAX_DEPENDENCY_GRAPH_PEERS),
    upstreamTotal: upstreamAll.length,
    downstreamTotal: downstreamAll.length,
  };
}

export type DependencyRole = 'selected' | 'upstream' | 'downstream';

/** Map each visible node to its dependency role relative to the selection. */
export function resolveDependencyRoles(
  selectedNodeId: string | null | undefined,
  nodes: BlueprintRFNode[],
  edges: BlueprintRFEdge[]
): Map<string, DependencyRole> {
  const roles = new Map<string, DependencyRole>();
  if (!selectedNodeId) return roles;

  const upstream = collectUpstreamNeighborhood(selectedNodeId, nodes, edges);
  const downstream = collectDownstreamNeighborhood(selectedNodeId, nodes, edges);

  roles.set(selectedNodeId, 'selected');
  for (const id of upstream) {
    if (id !== selectedNodeId) roles.set(id, 'upstream');
  }
  for (const id of downstream) {
    if (id === selectedNodeId || roles.has(id)) continue;
    roles.set(id, 'downstream');
  }
  return roles;
}

/**
 * When a group (or any of its children) is in the visible set, include the
 * group frame and all siblings so React Flow parent nodes are not orphaned.
 * Display-only; does not mutate schema.
 */
export function expandGroupVisibility(visible: Set<string>, nodes: BlueprintRFNode[]): Set<string> {
  const expanded = new Set(visible);
  const childrenByParent = new Map<string, string[]>();

  for (const node of nodes) {
    if (typeof node.parentId !== 'string') continue;
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node.id);
    childrenByParent.set(node.parentId, list);
  }

  for (const id of visible) {
    for (const childId of childrenByParent.get(id) ?? []) {
      expanded.add(childId);
    }
  }

  for (const [parentId, childIds] of childrenByParent) {
    if (!childIds.some(childId => visible.has(childId))) continue;
    expanded.add(parentId);
    for (const childId of childIds) expanded.add(childId);
  }

  return expanded;
}

/**
 * Collect the selected node plus every node reachable by walking dependency
 * edges upstream (incoming callers) and downstream (outgoing targets)
 * transitively. Sibling-only branches via a shared ancestor are excluded.
 *
 * Edges to or from a group are treated as connecting to every child in that
 * group (same assumption as resilience simulation). Display-only.
 */
export function collectDependencyNeighborhood(
  selectedNodeId: string | null | undefined,
  nodes: BlueprintRFNode[],
  edges: BlueprintRFEdge[]
): Set<string> {
  const visible = new Set<string>();
  if (!selectedNodeId) return visible;

  const nodeIds = new Set(nodes.map(n => n.id));
  if (!nodeIds.has(selectedNodeId)) return visible;

  const { outgoing, incoming } = buildAdjacency(nodes, edges, nodeIds);
  // Walk each direction separately so reaching an upstream node does not
  // fan out into that node's sibling downstream branches.
  for (const id of walkClosure(selectedNodeId, outgoing, nodes)) visible.add(id);
  for (const id of walkClosure(selectedNodeId, incoming, nodes)) visible.add(id);
  return expandGroupVisibility(visible, nodes);
}

/**
 * Transitive dependency neighborhood plus cross-diagram externals on any edge
 * touched by that closure. Display-only.
 */
export function collectDependencyNeighborhoodWithExternals(
  selectedNodeId: string | null | undefined,
  nodes: BlueprintRFNode[],
  edges: BlueprintRFEdge[],
  includeExternals: boolean
): Set<string> {
  const visible = collectDependencyNeighborhood(selectedNodeId, nodes, edges);
  if (!includeExternals || !selectedNodeId || visible.size === 0) return visible;

  const allNodeIds = new Set(nodes.map(n => n.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      const sourceIn = visible.has(edge.source);
      const targetIn = visible.has(edge.target);
      if (
        sourceIn &&
        !targetIn &&
        allNodeIds.has(edge.target) &&
        isExternalCanvasNode(edge.target, nodes)
      ) {
        visible.add(edge.target);
        changed = true;
      }
      if (
        targetIn &&
        !sourceIn &&
        allNodeIds.has(edge.source) &&
        isExternalCanvasNode(edge.source, nodes)
      ) {
        visible.add(edge.source);
        changed = true;
      }
    }
  }

  return expandGroupVisibility(visible, nodes);
}

/**
 * When enabled and a node is selected, keep only the selection and its
 * transitive upstream + downstream dependency neighborhood.
 */
export function filterSelectedDependencyFocusNodes(
  nodes: BlueprintRFNode[],
  edges: BlueprintRFEdge[],
  selectedNodeId: string | null | undefined,
  enabled: boolean,
  includeExternals = false
): BlueprintRFNode[] {
  if (!enabled || !selectedNodeId) return nodes;
  const visible = collectDependencyNeighborhoodWithExternals(
    selectedNodeId,
    nodes,
    edges,
    includeExternals
  );
  if (visible.size === 0) return nodes;
  return nodes.filter(n => visible.has(n.id));
}
