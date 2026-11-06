/** Spacing tuned for Blueprint RF cards in ArchLens Canvas. */
export const LAYOUT_ORIGIN = { x: 40, y: 40 } as const;

/**
 * Dagre graph spacing. nodesep/edgesep keep sibling cards and parallel edge labels
 * from touching; ranksep is only enough for a label between layers so a fitted
 * view can zoom in on the cards.
 */
export const DAGRE_SPACING = {
  nodesep: 64,
  edgesep: 40,
  ranksep: 96,
  marginx: 40,
  marginy: 48,
} as const;

/** Approximate RF edge-label box so dagre can reserve horizontal room between parallel edges. */
export function estimateEdgeLabelSize(label: string | undefined): {
  width: number;
  height: number;
} {
  if (!label?.trim()) return { width: 0, height: 0 };
  const width = Math.min(240, Math.max(48, Math.round(label.trim().length * 6.2)));
  return { width, height: 28 };
}

export const D3_FOREST_GAP = 120;
