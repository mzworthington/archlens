import dagre from 'dagre';
import type { LayoutEdgeInput, LayoutNodeInput, LayoutPosition } from '../../core';
import { DAGRE_SPACING, LAYOUT_ORIGIN, estimateEdgeLabelSize } from './constants';

/** Pure dagre layout - safe to run on the main thread or inside a Web Worker. */
export function computeDagrePositions(
  nodes: LayoutNodeInput[],
  edges: LayoutEdgeInput[]
): Map<string, LayoutPosition> {
  if (nodes.length === 0) return new Map();

  const g = new dagre.graphlib.Graph({ multigraph: false });
  g.setGraph({
    rankdir: 'TB',
    // network-simplex minimizes edge length/crossings better than tight-tree for C4 fans.
    ranker: 'network-simplex',
    ...DAGRE_SPACING,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const ordered = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  for (const node of ordered) {
    g.setNode(node.id, { width: node.width, height: node.height });
  }

  const seen = new Set<string>();
  for (const edge of [...edges].sort(
    (a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target)
  )) {
    const key = `${edge.source}->${edge.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const labelSize = estimateEdgeLabelSize(edge.label);
    g.setEdge(edge.source, edge.target, {
      ...labelSize,
      labelpos: 'c',
      labeloffset: 12,
      minlen: 1,
      weight: 1,
    });
  }

  dagre.layout(g);

  const positions = new Map<string, LayoutPosition>();
  for (const node of nodes) {
    const coords = g.node(node.id);
    if (!coords) {
      positions.set(node.id, { x: LAYOUT_ORIGIN.x, y: LAYOUT_ORIGIN.y });
      continue;
    }
    positions.set(node.id, {
      x: Math.round(coords.x - node.width / 2),
      y: Math.round(coords.y - node.height / 2),
    });
  }
  return positions;
}
