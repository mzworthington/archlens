import type { SystemNode } from '../models/schema';
import {
  getNodePosition,
  hasFinitePosition,
  withNodePosition,
  withoutNodePosition,
} from '../lib/nodePosition';

export { hasFinitePosition };

export function nodesNeedingLayout(nodes: SystemNode[]): SystemNode[] {
  return nodes.filter(n => !hasFinitePosition(n));
}

/** True when every node has saved coordinates (intentional persisted layout). */
export function hasCompleteSavedLayout(nodes: SystemNode[]): boolean {
  return nodes.length > 0 && nodesNeedingLayout(nodes).length === 0;
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
