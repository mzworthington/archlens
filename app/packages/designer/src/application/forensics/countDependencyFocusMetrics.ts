import type { DependencyViewMode } from './dependencyViewMode';
import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';
import {
  collectDependencyNeighborhood,
  collectDependencyNeighborhoodWithExternals,
} from './filterSelectedDependencyFocus';

export type DependencyFocusMetrics = {
  internalCount: number;
  externalInTree: number;
  externalHidden: number;
};

function isExternalNode(node: BlueprintRFNode): boolean {
  return node.data.external === true;
}

/**
 * Counts for the dependency focus chip and property panel.
 * externalHidden = externals in the full tree not shown in focus-only mode.
 */
export function countDependencyFocusMetrics(
  selectedNodeId: string | null | undefined,
  nodes: BlueprintRFNode[],
  edges: BlueprintRFEdge[],
  mode: DependencyViewMode
): DependencyFocusMetrics {
  if (!selectedNodeId || mode === 'full') {
    return { internalCount: 0, externalInTree: 0, externalHidden: 0 };
  }

  const focusSet = collectDependencyNeighborhood(selectedNodeId, nodes, edges);
  const fullSet = collectDependencyNeighborhoodWithExternals(selectedNodeId, nodes, edges, true);

  let internalCount = 0;
  let externalInTree = 0;
  let externalHidden = 0;

  for (const id of focusSet) {
    const node = nodes.find(n => n.id === id);
    if (!node || isExternalNode(node)) continue;
    internalCount++;
  }

  for (const id of fullSet) {
    const node = nodes.find(n => n.id === id);
    if (!node || !isExternalNode(node)) continue;
    externalInTree++;
    if (!focusSet.has(id)) externalHidden++;
  }

  if (mode === 'focus') {
    return { internalCount, externalInTree: 0, externalHidden };
  }

  return { internalCount, externalInTree, externalHidden: 0 };
}
