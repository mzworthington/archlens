/** Spacing tuned for Blueprint RF cards in ArchLens Canvas. */
export const LAYOUT_ORIGIN = { x: 40, y: 40 } as const;

/**
 * Dagre graph spacing. Wider nodesep/edgesep separates sibling fan-ins (actors → system)
 * so edge midpoints (and RF labels) collide less; ranksep leaves room between layers.
 */
export const DAGRE_SPACING = {
  nodesep: 200,
  edgesep: 120,
  ranksep: 320,
  marginx: 80,
  marginy: 96,
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

export const D3_FOREST_GAP = 260;
