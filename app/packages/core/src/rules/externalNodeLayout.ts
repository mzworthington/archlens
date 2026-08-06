import type { EntityRef, SystemDependency, SystemNode } from '../models/schema';
import { getNodePosition, hasFinitePosition, withNodePosition } from '../lib/nodePosition';
import { DEFAULT_NODE_SIZE } from './parentChildLayout';

export type ExternalNodeDirection = {
  /** External node calls into the diagram (incoming dependency). */
  upstream: boolean;
  /** Diagram calls into the external node (outgoing dependency). */
  downstream: boolean;
};

export type ExternalPlacementBand = 'upstream' | 'downstream';

export type ExternalNodeLayoutOptions = {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;
  /** When set, caps how wide a single horizontal row may grow before wrapping. `0` = match internal graph width. */
  maxRowWidth?: number;
  origin?: { x: number; y: number };
};

type BoundingBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
};

const DEFAULT_LAYOUT: Required<ExternalNodeLayoutOptions> = {
  nodeWidth: DEFAULT_NODE_SIZE.width,
  nodeHeight: DEFAULT_NODE_SIZE.height,
  horizontalGap: 220,
  verticalGap: 160,
  maxRowWidth: 0,
  origin: { x: 100, y: 100 },
};

function resolveOptions(
  options: ExternalNodeLayoutOptions = {}
): Required<ExternalNodeLayoutOptions> {
  return { ...DEFAULT_LAYOUT, ...options };
}

function isInternalNode(nodes: SystemNode[], entityRef: string): boolean {
  const node = nodes.find(n => n.entityRef === entityRef);
  return !!node && !node.external;
}

export function classifyExternalNodeDirection(
  entityRef: string,
  nodes: SystemNode[],
  dependencies: SystemDependency[]
): ExternalNodeDirection {
  let upstream = false;
  let downstream = false;

  for (const dep of dependencies) {
    if (dep.from === entityRef && isInternalNode(nodes, dep.to)) {
      upstream = true;
    }
    if (dep.to === entityRef && isInternalNode(nodes, dep.from)) {
      downstream = true;
    }
  }

  return { upstream, downstream };
}

export function resolveExternalPlacementBand(
  direction: ExternalNodeDirection
): ExternalPlacementBand {
  if (direction.upstream) return 'upstream';
  if (direction.downstream) return 'downstream';
  return 'upstream';
}

function internalBoundingBox(
  nodes: SystemNode[],
  options: Required<ExternalNodeLayoutOptions>
): BoundingBox {
  const internal = nodes.filter(n => !n.external);
  const positioned = internal.filter(hasFinitePosition);

  if (positioned.length === 0) {
    const { origin, nodeWidth, nodeHeight } = options;
    return {
      minX: origin.x,
      minY: origin.y,
      maxX: origin.x + nodeWidth,
      maxY: origin.y + nodeHeight,
      centerX: origin.x + nodeWidth / 2,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of positioned) {
    const pos = getNodePosition(node)!;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + options.nodeWidth);
    maxY = Math.max(maxY, pos.y + options.nodeHeight);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
  };
}

function layoutBandRows(
  refs: string[],
  band: ExternalPlacementBand,
  bbox: BoundingBox,
  options: Required<ExternalNodeLayoutOptions>,
  sortKeys: Map<string, number>
): Map<EntityRef, { x: number; y: number }> {
  const positions = new Map<EntityRef, { x: number; y: number }>();
  if (refs.length === 0) return positions;

  const sorted = [...refs].sort((a, b) => {
    const ka = sortKeys.get(a) ?? Number.POSITIVE_INFINITY;
    const kb = sortKeys.get(b) ?? Number.POSITIVE_INFINITY;
    if (ka !== kb) return ka - kb;
    return a.localeCompare(b);
  });
  const stepX = options.nodeWidth + options.horizontalGap;
  const rowHeight = options.nodeHeight + options.verticalGap;
  const maxNodesPerRow =
    options.maxRowWidth > 0
      ? Math.max(1, Math.floor((options.maxRowWidth + options.horizontalGap) / stepX))
      : sorted.length;

  const rows: string[][] = [];
  for (let i = 0; i < sorted.length; i += maxNodesPerRow) {
    rows.push(sorted.slice(i, i + maxNodesPerRow));
  }

  rows.forEach((row, rowIndex) => {
    const rowPixelWidth = row.length * options.nodeWidth + (row.length - 1) * options.horizontalGap;
    const startX = Math.round(bbox.centerX - rowPixelWidth / 2);

    const y =
      band === 'upstream'
        ? bbox.minY - options.verticalGap - options.nodeHeight - rowIndex * rowHeight
        : bbox.maxY + options.verticalGap + rowIndex * rowHeight;

    row.forEach((ref, colIndex) => {
      positions.set(ref, {
        x: startX + colIndex * stepX,
        y,
      });
    });
  });

  return positions;
}

/**
 * Prefer left-to-right order matching connected internals (barycenter) so edges
 * to/from externals cross less often than a pure entityRef sort.
 */
export function externalBandSortKeys(
  nodes: SystemNode[],
  dependencies: SystemDependency[],
  refs: string[],
  band: ExternalPlacementBand,
  options: Required<ExternalNodeLayoutOptions>
): Map<string, number> {
  const keys = new Map<string, number>();
  const internals = new Map(
    nodes
      .filter(n => !n.external && n.entityRef && hasFinitePosition(n))
      .map(n => [n.entityRef!, n])
  );

  for (const ref of refs) {
    const xs: number[] = [];
    for (const dep of dependencies) {
      if (band === 'downstream' && dep.to === ref) {
        const source = internals.get(dep.from);
        if (source) xs.push(getNodePosition(source)!.x + options.nodeWidth / 2);
      }
      if (band === 'upstream' && dep.from === ref) {
        const target = internals.get(dep.to);
        if (target) xs.push(getNodePosition(target)!.x + options.nodeWidth / 2);
      }
    }
    if (xs.length > 0) {
      keys.set(ref, xs.reduce((a, b) => a + b, 0) / xs.length);
    }
  }
  return keys;
}

/**
 * Compute x/y for external nodes: upstream band above internals, downstream below.
 */
export function computeDirectionalExternalPositions(
  nodes: SystemNode[],
  dependencies: SystemDependency[],
  externalEntityRefs: Iterable<string>,
  options?: ExternalNodeLayoutOptions
): Map<EntityRef, { x: number; y: number }> {
  const resolved = resolveOptions(options);
  const bbox = internalBoundingBox(nodes, resolved);
  const upstreamRefs: string[] = [];
  const downstreamRefs: string[] = [];

  for (const entityRef of externalEntityRefs) {
    const direction = classifyExternalNodeDirection(entityRef, nodes, dependencies);
    const band = resolveExternalPlacementBand(direction);
    if (band === 'upstream') upstreamRefs.push(entityRef);
    else downstreamRefs.push(entityRef);
  }

  const positions = new Map<EntityRef, { x: number; y: number }>();
  const upstreamKeys = externalBandSortKeys(
    nodes,
    dependencies,
    upstreamRefs,
    'upstream',
    resolved
  );
  const downstreamKeys = externalBandSortKeys(
    nodes,
    dependencies,
    downstreamRefs,
    'downstream',
    resolved
  );
  for (const [ref, pos] of layoutBandRows(upstreamRefs, 'upstream', bbox, resolved, upstreamKeys)) {
    positions.set(ref, pos);
  }
  for (const [ref, pos] of layoutBandRows(
    downstreamRefs,
    'downstream',
    bbox,
    resolved,
    downstreamKeys
  )) {
    positions.set(ref, pos);
  }
  return positions;
}

/** Re-position every external node on the diagram (internals unchanged). */
export function positionExternalNodes(
  nodes: SystemNode[],
  dependencies: SystemDependency[],
  options?: ExternalNodeLayoutOptions
): SystemNode[] {
  const hasInternal = nodes.some(n => !n.external);
  // External-only diagrams (e.g. provisioned IaC products): free placement — do not
  // force band layout relative to a missing internal graph.
  if (!hasInternal) return nodes;

  const externalRefs = nodes
    .filter((n): n is SystemNode & { entityRef: string } => !!n.external && !!n.entityRef)
    .map(n => n.entityRef);

  if (externalRefs.length === 0) return nodes;

  const positions = computeDirectionalExternalPositions(nodes, dependencies, externalRefs, options);

  return nodes.map(node => {
    if (!node.external || !node.entityRef) return node;
    const pos = positions.get(node.entityRef);
    return pos ? withNodePosition(node, pos) : node;
  });
}

export function layoutExternalNodesOnDiagram(
  schema: { nodes: SystemNode[]; dependencies: SystemDependency[] },
  options?: ExternalNodeLayoutOptions
): SystemNode[] {
  return positionExternalNodes(schema.nodes, schema.dependencies, options);
}
