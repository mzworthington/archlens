import type { SystemNode } from '../models/schema';
import {
  getNodePosition,
  hasFinitePosition,
  withNodePosition,
  withoutNodePosition,
} from '../lib/nodePosition';

export { hasFinitePosition };

export type BoundingBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type LayoutMergeOptions = {
  /** Horizontal gap between preserved cluster and newly laid-out nodes. */
  gap?: number;
  /** When true, ignore previous positions and use laidOutGaps as the full result. */
  forceRelayout?: boolean;
};

const DEFAULT_GAP = 80;

export function nodesNeedingLayout(nodes: SystemNode[]): SystemNode[] {
  return nodes.filter(n => !hasFinitePosition(n));
}

/** True when every node has saved coordinates (intentional persisted layout). */
export function hasCompleteSavedLayout(nodes: SystemNode[]): boolean {
  return nodes.length > 0 && nodesNeedingLayout(nodes).length === 0;
}

export function preservedBoundingBox(nodes: SystemNode[]): BoundingBox | null {
  const positioned = nodes.filter(hasFinitePosition);
  if (positioned.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of positioned) {
    const pos = getNodePosition(n)!;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x);
    maxY = Math.max(maxY, pos.y);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Copy finite positions from previous nodes onto matching next entityRefs.
 * Nodes without a prior position are left without coordinates (layout gap).
 */
export function seedPreservedPositions(previous: SystemNode[], next: SystemNode[]): SystemNode[] {
  const previousByRef = new Map(previous.map(n => [n.entityRef, n]));
  return next.map(n => {
    const prev = previousByRef.get(n.entityRef);
    const prevPos = prev ? getNodePosition(prev) : undefined;
    if (prevPos) {
      return withNodePosition(n, prevPos);
    }
    return withoutNodePosition(n);
  });
}

/**
 * Shifts a laid-out gap cluster to the right of the preserved bounding box.
 */
export function mergeLaidOutGapNodes(
  preserved: SystemNode[],
  laidOutGaps: SystemNode[],
  options: LayoutMergeOptions = {}
): SystemNode[] {
  const gap = options.gap ?? DEFAULT_GAP;
  const bbox = preservedBoundingBox(preserved);
  if (!bbox || laidOutGaps.length === 0) {
    return [...preserved, ...laidOutGaps];
  }

  const gapBox = preservedBoundingBox(laidOutGaps);
  const offsetX = gapBox ? bbox.maxX + gap - gapBox.minX : bbox.maxX + gap;

  const shifted = laidOutGaps.map(n => {
    const pos = getNodePosition(n) ?? { x: 0, y: 0 };
    return withNodePosition(n, { x: pos.x + offsetX, y: pos.y });
  });

  return [...preserved, ...shifted];
}

/**
 * Merge next-scan nodes with previous positions: keep coordinates for matching entityRefs,
 * layout only gap nodes, place them beside the preserved cluster.
 *
 * `laidOutGaps` must be the layout-engine output for {@link nodesNeedingLayout}(next)
 * (or the full next set when `forceRelayout` is true).
 */
export function mergeLayoutPositions(
  previous: SystemNode[],
  next: SystemNode[],
  laidOutGaps: SystemNode[],
  options: LayoutMergeOptions = {}
): SystemNode[] {
  if (options.forceRelayout) {
    const byRef = new Map(laidOutGaps.map(n => [n.entityRef, n]));
    return next.map(n => {
      const laid = byRef.get(n.entityRef);
      const laidPos = laid ? getNodePosition(laid) : undefined;
      return laidPos ? withNodePosition(n, laidPos) : { ...n };
    });
  }

  const previousByRef = new Map(previous.map(n => [n.entityRef, n]));
  const laidByRef = new Map(laidOutGaps.map(n => [n.entityRef, n]));

  const withPreserved = next.map(n => {
    const prev = previousByRef.get(n.entityRef);
    const prevPos = prev ? getNodePosition(prev) : undefined;
    if (prevPos) {
      return withNodePosition(n, prevPos);
    }
    const laid = laidByRef.get(n.entityRef);
    const laidPos = laid ? getNodePosition(laid) : undefined;
    if (laidPos) {
      return withNodePosition(n, laidPos);
    }
    return { ...n };
  });

  const preserved = withPreserved.filter(hasFinitePosition).filter(n => {
    const prev = previousByRef.get(n.entityRef);
    return prev && hasFinitePosition(prev);
  });
  const gaps = withPreserved.filter(n => {
    const prev = previousByRef.get(n.entityRef);
    return !(prev && hasFinitePosition(prev));
  });

  // Gaps already have layout coords from laidOutGaps; shift relative to preserved bbox.
  const shiftedGaps = (() => {
    const bbox = preservedBoundingBox(preserved);
    if (!bbox || gaps.length === 0) return gaps;
    const gapBox = preservedBoundingBox(gaps);
    const gap = options.gap ?? DEFAULT_GAP;
    const offsetX = gapBox ? bbox.maxX + gap - gapBox.minX : bbox.maxX + gap;
    return gaps.map(n => {
      const pos = getNodePosition(n) ?? { x: 0, y: 0 };
      return withNodePosition(n, { x: pos.x + offsetX, y: pos.y });
    });
  })();

  const byRef = new Map<string, SystemNode>();
  for (const n of preserved) byRef.set(n.entityRef, n);
  for (const n of shiftedGaps) byRef.set(n.entityRef, n);
  return next.map(n => byRef.get(n.entityRef) ?? n);
}
