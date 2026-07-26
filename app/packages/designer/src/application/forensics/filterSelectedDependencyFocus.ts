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

function walkClosure(startId: string, adjacency: Map<string, string[]>): Set<string> {
  const visited = new Set<string>();
  const stack = [startId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const next of adjacency.get(id) ?? []) {
      if (!visited.has(next)) stack.push(next);
    }
  }
  return visited;
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
  for (const id of walkClosure(selectedNodeId, outgoing)) visible.add(id);
  for (const id of walkClosure(selectedNodeId, incoming)) visible.add(id);
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
  enabled: boolean
): BlueprintRFNode[] {
  if (!enabled || !selectedNodeId) return nodes;
  const visible = collectDependencyNeighborhood(selectedNodeId, nodes, edges);
  if (visible.size === 0) return nodes;
  return nodes.filter(n => visible.has(n.id));
}
