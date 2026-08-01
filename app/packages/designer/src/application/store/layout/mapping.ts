import type {
  SystemSchema,
  SystemNode,
  SystemDependency,
  NodeType,
  DependencyType,
  PropertyMap,
  C4Level,
  NodeForensics,
  NodeResilience,
  SourceProvenance,
} from '@archlens/core';
import { withNodePosition } from '@archlens/core';
import type { NodeSafeguards } from '@archlens/core/resilience';
import { fitGroupBounds, resolveGroupContentLayout } from '@archlens/core/layout';
import { getNodePosition } from '@archlens/core';
import { NODE_SIZE } from '../../layout/constants';
import { dependencyArrowMarker } from './edgeAnimation';
import type { CanvasEdgeMarker } from './edgeAnimation';
import { getAbsoluteNodePosition } from './groupedLayout';

export type ComponentNodeData = {
  [key: string]: unknown;
  id: string;
  type: NodeType;
  name: string;
  external?: boolean;
  isTest?: boolean;
  properties: PropertyMap;
  entityRef?: string;
  forensics?: NodeForensics;
  resilience?: NodeResilience;
  /** Transient ChaosLens safeguard toggles for canvas badges (display-only). */
  resilienceSafeguards?: NodeSafeguards;
  couplingHighlight?: boolean;
  /** Ephemeral coupling peer not yet on the diagram (display-only). */
  couplingGhost?: boolean;
  couplingGhostPosition?: { x: number; y: number };
  refactorBoundaryHighlight?: boolean;
  hotspotHeat?: number;
  blastHeat?: number;
  integrityHeat?: number;
  isResilienceSpof?: boolean;
  isResilienceFaultTarget?: boolean;
  /** True while the blast-radius ripple wave is active on this node. */
  blastRipple?: boolean;
  /** True when outside the active ChaosLens simulation scope (display-only). */
  resilienceOutOfScope?: boolean;
  /** Ephemeral grouped external boundary (display-only). */
  externalSummaryHub?: boolean;
  externalSummaryBand?: 'callers' | 'targets';
  externalSummaryCount?: number;
};

/** Canvas node DTO - structurally compatible with React Flow Node. */
export type BlueprintRFNode = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: ComponentNodeData;
  measured?: { width?: number; height?: number };
  selected?: boolean;
  dragging?: boolean;
  [key: string]: unknown;
};

export type ComponentEdgeData = {
  [key: string]: unknown;
  type: DependencyType;
  description: string;
};

/** Canvas edge DTO - structurally compatible with React Flow Edge. */
export type BlueprintRFEdge = {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  markerEnd?: CanvasEdgeMarker | string;
  data?: ComponentEdgeData;
  label?: string;
  style?: Record<string, unknown>;
  labelStyle?: Record<string, unknown>;
  labelBgStyle?: Record<string, unknown>;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  [key: string]: unknown;
};

function parentDepth(node: SystemNode, nodes: SystemNode[]): number {
  let depth = 0;
  let current = node.parentEntityRef;
  const refs = new Set(nodes.map(n => n.entityRef));
  while (current && refs.has(current)) {
    depth += 1;
    const parent = nodes.find(n => n.entityRef === current);
    current = parent?.parentEntityRef;
  }
  return depth;
}

function buildComponentNodeData(n: SystemNode, ref: string): ComponentNodeData {
  return {
    id: ref,
    type: n.type,
    name: n.name,
    external: n.external,
    isTest: n.isTest,
    properties: n.properties || {},
    entityRef: ref,
    forensics: n.forensics,
    resilience: n.resilience,
  };
}

export function getNodeDimensions(node: BlueprintRFNode): { width: number; height: number } {
  const style = node.style as { width?: number; height?: number } | undefined;
  return {
    width: node.measured?.width ?? style?.width ?? NODE_SIZE.width,
    height: node.measured?.height ?? style?.height ?? NODE_SIZE.height,
  };
}

export function sortNodesForReactFlow(nodes: BlueprintRFNode[]): BlueprintRFNode[] {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const depth = (node: BlueprintRFNode): number => {
    let d = 0;
    let parentId = typeof node.parentId === 'string' ? node.parentId : undefined;
    while (parentId && byId.has(parentId)) {
      d += 1;
      const parent = byId.get(parentId)!;
      parentId = typeof parent.parentId === 'string' ? parent.parentId : undefined;
    }
    return d;
  };
  return [...nodes].sort((a, b) => depth(a) - depth(b) || a.id.localeCompare(b.id));
}

export const mapDomainNodesToRFNodes = (nodes: SystemNode[]): BlueprintRFNode[] => {
  const childrenByParent = new Map<string, SystemNode[]>();
  for (const node of nodes) {
    if (!node.parentEntityRef) continue;
    const list = childrenByParent.get(node.parentEntityRef) ?? [];
    list.push(node);
    childrenByParent.set(node.parentEntityRef, list);
  }

  const groupLayouts = new Map<string, ReturnType<typeof resolveGroupContentLayout>>();
  for (const [parentRef, children] of childrenByParent) {
    groupLayouts.set(parentRef, resolveGroupContentLayout(children));
  }

  const sorted = [...nodes].sort((a, b) => parentDepth(a, nodes) - parentDepth(b, nodes));
  const rfNodes: BlueprintRFNode[] = [];

  for (const node of sorted) {
    const ref = node.entityRef || `node-${Math.random().toString(36).substring(2, 9)}`;

    if (node.type === 'group') {
      const layout = groupLayouts.get(ref);
      const bounds = layout?.bounds ?? {
        width: fitGroupBounds([]).width,
        height: fitGroupBounds([]).height,
      };
      const nodePos = getNodePosition(node);
      rfNodes.push({
        id: ref,
        type: 'blueprintGroup',
        position: { x: nodePos?.x ?? 0, y: nodePos?.y ?? 0 },
        style: { width: bounds.width, height: bounds.height },
        width: bounds.width,
        height: bounds.height,
        zIndex: -1,
        data: buildComponentNodeData(node, ref),
      });
      continue;
    }

    const parentLayout = node.parentEntityRef ? groupLayouts.get(node.parentEntityRef) : undefined;
    const childPos = parentLayout?.positionsByRef.get(ref);

    const nodePos = getNodePosition(node);
    rfNodes.push({
      id: ref,
      type: 'blueprintNode',
      position: childPos ?? { x: nodePos?.x ?? 0, y: nodePos?.y ?? 0 },
      ...(node.parentEntityRef ? { parentId: node.parentEntityRef, extent: 'parent' } : {}),
      data: buildComponentNodeData(node, ref),
    });
  }

  return rfNodes;
};

export const mapDomainNodeToRFNode = (n: SystemNode): BlueprintRFNode => {
  const mapped = mapDomainNodesToRFNodes([n]);
  return mapped[0]!;
};

export const mapDomainDepToRFEdge = (d: SystemDependency): BlueprintRFEdge => ({
  id: `edge-${d.from}-${d.to}`,
  source: d.from,
  target: d.to,
  type: 'default',
  animated: d.type === 'publish-subscribe',
  markerEnd: dependencyArrowMarker(),
  data: { type: d.type, description: d.description || '' },
  label: d.description || undefined,
  style: {
    strokeWidth: 2,
  },
  labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 500 },
  labelBgStyle: { fill: '#020617', fillOpacity: 0.85 },
  labelBgPadding: [6, 4] as [number, number],
  labelBgBorderRadius: 4,
});

/** Map deps to RF edges, dropping duplicate from→to pairs (same React key). */
export const mapDomainDepsToRFEdges = (deps: SystemDependency[]): BlueprintRFEdge[] => {
  const seen = new Set<string>();
  const edges: BlueprintRFEdge[] = [];
  for (const dep of deps) {
    const edge = mapDomainDepToRFEdge(dep);
    if (seen.has(edge.id)) continue;
    seen.add(edge.id);
    edges.push(edge);
  }
  return edges;
};

export type LayoutDirection = 'TB' | 'LR';

/** Default dependency edge routing: top-to-bottom (caller below callee connects downward). */
export const DEFAULT_LAYOUT_DIRECTION: LayoutDirection = 'TB';

export const getClosestHandles = (
  sourceNode: BlueprintRFNode,
  targetNode: BlueprintRFNode,
  allNodes?: BlueprintRFNode[],
  direction: LayoutDirection = DEFAULT_LAYOUT_DIRECTION
): { sourceHandle: string; targetHandle: string } => {
  const nodeById = new Map((allNodes ?? [sourceNode, targetNode]).map(n => [n.id, n]));
  const sourcePos = getAbsoluteNodePosition(sourceNode, nodeById);
  const targetPos = getAbsoluteNodePosition(targetNode, nodeById);

  const aw = getNodeDimensions(sourceNode).width;
  const ah = getNodeDimensions(sourceNode).height;
  const ax = sourcePos.x;
  const ay = sourcePos.y;

  const bw = getNodeDimensions(targetNode).width;
  const bh = getNodeDimensions(targetNode).height;
  const bx = targetPos.x;
  const by = targetPos.y;

  const cxA = ax + aw / 2;
  const cyA = ay + ah / 2;
  const cxB = bx + bw / 2;
  const cyB = by + bh / 2;

  const dx = cxB - cxA;
  const dy = cyB - cyA;

  if (direction === 'TB') {
    if (dy >= 0) {
      return { sourceHandle: 'bottom-source', targetHandle: 'top-target' };
    }
    return { sourceHandle: 'top-source', targetHandle: 'bottom-target' };
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      return { sourceHandle: 'right-source', targetHandle: 'left-target' };
    }
    return { sourceHandle: 'left-source', targetHandle: 'right-target' };
  }

  if (dy > 0) {
    return { sourceHandle: 'bottom-source', targetHandle: 'top-target' };
  }
  return { sourceHandle: 'top-source', targetHandle: 'bottom-target' };
};

export const rebuildSchemaFromCanvas = (
  name: string,
  version: string,
  level: C4Level,
  rfNodes: BlueprintRFNode[],
  rfEdges: BlueprintRFEdge[],
  entityRef?: string,
  source?: SourceProvenance,
  persistLayoutCoordinates = true
): SystemSchema => {
  const nodes: SystemNode[] = rfNodes.map(rn => {
    const isGroup = rn.type === 'blueprintGroup';
    const parentId = typeof rn.parentId === 'string' ? rn.parentId : undefined;
    const node: SystemNode = {
      type: isGroup ? 'group' : rn.data.type,
      name: rn.data.name,
      external: rn.data.external,
      isTest: rn.data.isTest,
      properties: rn.data.properties,
      forensics: rn.data.forensics,
      resilience: rn.data.resilience,
      entityRef: rn.data.entityRef || rn.id || '',
      ...(parentId ? { parentEntityRef: parentId } : {}),
    };
    if (persistLayoutCoordinates) {
      return withNodePosition(node, rn.position);
    }
    return node;
  });

  const dependencies: SystemDependency[] = rfEdges.map(re => ({
    from: re.source,
    to: re.target,
    type: re.data?.type || 'direct-call',
    description: re.data?.description || '',
  }));

  return {
    name,
    version,
    level,
    nodes,
    dependencies,
    entityRef,
    ...(source ? { source } : {}),
  };
};
