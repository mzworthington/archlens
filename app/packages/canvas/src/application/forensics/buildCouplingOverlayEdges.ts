import type { SystemDependency, WorkspaceFilepathIndex } from '@archlens/core';
import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';
import { dependencyArrowMarker, getClosestHandles } from '../store/layoutUtils';
import { resolveCouplingEdges, type CouplingEdgeRef } from './resolveCouplingEdges';

export const COUPLING_EDGE_PREFIX = 'coupling-';
const COUPLING_SCHEMA_EDGE_PREFIX = 'coupling-schema-';

const GHOST_LAYOUT_RADIUS = 300;

function basename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
}

function nodeCenter(node: BlueprintRFNode): { x: number; y: number } {
  const width = node.measured?.width ?? 256;
  const height = node.measured?.height ?? 120;
  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  };
}

/**
 * Ephemeral ghost nodes for coupled files that are not on the active diagram.
 */
export function buildCouplingGhostNodes(
  selectedNodeId: string | null | undefined,
  nodes: BlueprintRFNode[],
  refs: CouplingEdgeRef[],
  enabled: boolean
): BlueprintRFNode[] {
  if (!enabled || !selectedNodeId) return [];

  const selected = nodes.find(n => n.id === selectedNodeId);
  if (!selected) return [];

  const ghosts = refs.filter(ref => ref.resolution !== 'canvas');
  if (ghosts.length === 0) return [];

  const center = nodeCenter(selected);

  return ghosts.map((ref, index) => {
    const angle = (2 * Math.PI * index) / ghosts.length - Math.PI / 2;
    const x = center.x + GHOST_LAYOUT_RADIUS * Math.cos(angle) - 128;
    const y = center.y + GHOST_LAYOUT_RADIUS * Math.sin(angle) - 60;
    const name = ref.peerName || basename(ref.path);

    return {
      id: ref.targetId,
      type: 'blueprintNode',
      position: { x, y },
      draggable: false,
      selectable: true,
      data: {
        id: ref.targetId,
        type: 'component',
        name,
        external: true,
        couplingGhost: true,
        couplingGhostPosition: { x, y },
        properties: { filepath: ref.path },
        entityRef: ref.entityRef,
      },
    };
  });
}

function couplingEdgeFromRef(
  ref: CouplingEdgeRef,
  nodes: BlueprintRFNode[],
  ghostNodes: BlueprintRFNode[]
): BlueprintRFEdge | null {
  const allNodes = [...nodes, ...ghostNodes];
  const byId = new Map(allNodes.map(n => [n.id, n]));
  const source = byId.get(ref.sourceId);
  const target = byId.get(ref.targetId);
  if (!source || !target) return null;

  const handles = getClosestHandles(source, target, allNodes);
  return {
    id: `${COUPLING_EDGE_PREFIX}${ref.sourceId}-${ref.targetId}`,
    source: ref.sourceId,
    target: ref.targetId,
    sourceHandle: handles.sourceHandle,
    targetHandle: handles.targetHandle,
    type: 'default',
    animated: true,
    markerEnd: dependencyArrowMarker('#f59e0b'),
    selectable: false,
    focusable: false,
    data: {
      type: 'direct-call' as const,
      description: `coupling ${ref.score.toFixed(2)}`,
      coupling: true,
      score: ref.score,
      sharedCommits: ref.sharedCommits,
    },
    label: `${ref.score.toFixed(2)}`,
    style: {
      stroke: '#f59e0b',
      strokeWidth: 2,
      strokeDasharray: '6 4',
    },
    labelStyle: { fill: '#fbbf24', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#020617', fillOpacity: 0.9 },
    labelBgPadding: [6, 4] as [number, number],
    labelBgBorderRadius: 4,
  };
}

/**
 * Build ephemeral React Flow edges for temporal coupling of the selected node.
 * These are display-only and must not be written into the schema.
 */
export function buildCouplingOverlayEdges(
  nodes: BlueprintRFNode[],
  refs: CouplingEdgeRef[],
  enabled: boolean,
  ghostNodes: BlueprintRFNode[] = []
): BlueprintRFEdge[] {
  if (!enabled || refs.length === 0) return [];

  return refs
    .map(ref => couplingEdgeFromRef(ref, nodes, ghostNodes))
    .filter((edge): edge is BlueprintRFEdge => edge != null);
}

function collectFocusEntityRefs(
  selectedNodeId: string | null | undefined,
  nodes: BlueprintRFNode[],
  refs: CouplingEdgeRef[]
): Set<string> {
  const entityRefs = new Set<string>();
  const selected = nodes.find(n => n.id === selectedNodeId);
  if (selected?.data.entityRef) entityRefs.add(selected.data.entityRef);

  for (const ref of refs) {
    if (ref.entityRef) {
      entityRefs.add(ref.entityRef);
      continue;
    }
    const target = nodes.find(n => n.id === ref.targetId);
    if (target?.data.entityRef) entityRefs.add(target.data.entityRef);
  }

  return entityRefs;
}

/**
 * Overlay declared schema dependencies between the selected node and its coupling peers.
 */
export function buildCouplingSchemaDependencyEdges(
  selectedNodeId: string | null | undefined,
  nodes: BlueprintRFNode[],
  ghostNodes: BlueprintRFNode[],
  dependencies: SystemDependency[],
  refs: CouplingEdgeRef[],
  enabled: boolean,
  showSchemaDeps: boolean
): BlueprintRFEdge[] {
  if (!enabled || !showSchemaDeps || !selectedNodeId) return [];

  const focusRefs = collectFocusEntityRefs(selectedNodeId, nodes, refs);
  if (focusRefs.size < 2) return [];

  const entityRefToNodeId = new Map<string, string>();
  for (const node of [...nodes, ...ghostNodes]) {
    if (node.data.entityRef) entityRefToNodeId.set(node.data.entityRef, node.id);
  }
  for (const ref of refs) {
    if (ref.entityRef) entityRefToNodeId.set(ref.entityRef, ref.targetId);
  }

  const allNodes = [...nodes, ...ghostNodes];
  const byId = new Map(allNodes.map(node => [node.id, node]));
  const edges: BlueprintRFEdge[] = [];

  for (const dep of dependencies) {
    if (!focusRefs.has(dep.from) || !focusRefs.has(dep.to)) continue;

    const selected = nodes.find(n => n.id === selectedNodeId);
    const selectedRef = selected?.data.entityRef;
    if (selectedRef && dep.from !== selectedRef && dep.to !== selectedRef) continue;

    const sourceId = entityRefToNodeId.get(dep.from);
    const targetId = entityRefToNodeId.get(dep.to);
    if (!sourceId || !targetId) continue;

    const source = byId.get(sourceId);
    const target = byId.get(targetId);
    if (!source || !target) continue;

    const handles = getClosestHandles(source, target, allNodes);
    edges.push({
      id: `${COUPLING_SCHEMA_EDGE_PREFIX}${dep.from}-${dep.to}`,
      source: sourceId,
      target: targetId,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      type: 'default',
      animated: false,
      markerEnd: dependencyArrowMarker('#00d8ff'),
      selectable: false,
      focusable: false,
      data: {
        type: dep.type,
        description: dep.description ?? dep.type,
        schemaDependency: true,
      },
      label: dep.description,
      style: {
        stroke: '#00d8ff',
        strokeWidth: 2,
      },
    });
  }

  return edges;
}

export function applyRefactorBoundaryHighlights(
  nodes: BlueprintRFNode[],
  entityRefs: readonly string[] | null | undefined
): BlueprintRFNode[] {
  const highlightIds = new Set(entityRefs ?? []);
  if (highlightIds.size === 0) {
    return nodes.map(n =>
      n.data.refactorBoundaryHighlight
        ? { ...n, data: { ...n.data, refactorBoundaryHighlight: false } }
        : n
    );
  }

  return nodes.map(n => {
    const highlight = highlightIds.has(n.id);
    if (Boolean(n.data.refactorBoundaryHighlight) === highlight) return n;
    return { ...n, data: { ...n.data, refactorBoundaryHighlight: highlight } };
  });
}

export function applyCouplingHighlights(
  nodes: BlueprintRFNode[],
  selectedNodeId: string | null | undefined,
  enabled: boolean,
  workspaceIndex?: WorkspaceFilepathIndex,
  refs?: CouplingEdgeRef[]
): BlueprintRFNode[] {
  if (!enabled) {
    return nodes.map(n =>
      n.data.couplingHighlight ? { ...n, data: { ...n.data, couplingHighlight: false } } : n
    );
  }

  const coupledIds = new Set(
    (refs ?? (selectedNodeId ? resolveCouplingEdges(selectedNodeId, nodes, workspaceIndex) : []))
      .filter(ref => ref.resolution === 'canvas')
      .map(ref => ref.targetId)
  );
  if (coupledIds.size === 0) {
    return nodes.map(n =>
      n.data.couplingHighlight ? { ...n, data: { ...n.data, couplingHighlight: false } } : n
    );
  }

  return nodes.map(n => {
    const highlight = coupledIds.has(n.id);
    if (Boolean(n.data.couplingHighlight) === highlight) return n;
    return { ...n, data: { ...n.data, couplingHighlight: highlight } };
  });
}

/**
 * When coupling focus is on, keep only the selected node, its on-canvas coupled peers, and ghosts.
 * Resolution still uses the full incoming node list so peers are found before filtering.
 */
export function filterCouplingFocusNodes(
  nodes: BlueprintRFNode[],
  selectedNodeId: string | null | undefined,
  enabled: boolean,
  ghostNodes: BlueprintRFNode[] = [],
  workspaceIndex?: WorkspaceFilepathIndex
): BlueprintRFNode[] {
  if (!enabled || !selectedNodeId) return nodes;

  const selected = nodes.find(n => n.id === selectedNodeId);
  // Cross-diagram externals are not temporal-coupling peers; keep the canvas stable when one is selected.
  if (selected?.data.external) return nodes;

  const refs = resolveCouplingEdges(selectedNodeId, nodes, workspaceIndex);
  const peerIds = new Set(refs.map(ref => ref.targetId));
  if (peerIds.size === 0) return nodes;

  peerIds.add(selectedNodeId);
  const filtered = nodes.filter(n => peerIds.has(n.id));
  const existingIds = new Set(filtered.map(n => n.id));
  const missingGhosts = ghostNodes.filter(
    ghost => peerIds.has(ghost.id) && !existingIds.has(ghost.id)
  );
  return missingGhosts.length > 0 ? [...filtered, ...missingGhosts] : filtered;
}
