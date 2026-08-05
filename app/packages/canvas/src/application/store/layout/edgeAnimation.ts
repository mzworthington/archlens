/** Matches canvas edge stroke (see `.react-flow__edge-path` in index.css). */
export const DEPENDENCY_EDGE_STROKE = '#00d8ff';

/** Framework-agnostic edge marker (compatible with React Flow EdgeMarker). */
export type CanvasEdgeMarker = {
  type: 'arrow' | 'arrowclosed';
  width?: number;
  height?: number;
  color?: string;
};

export function dependencyArrowMarker(color: string = DEPENDENCY_EDGE_STROKE): CanvasEdgeMarker {
  return {
    type: 'arrowclosed',
    width: 18,
    height: 18,
    color,
  };
}

export type EdgeAnimationOptions = {
  liteCanvas?: boolean;
  preferReducedMotion?: boolean;
};

/** Flow animation: incident to selection, or all edges in focus mode. */
export function shouldAnimateDependencyEdge(
  edge: { source: string; target: string; animated?: boolean },
  selectedNodeId: string | null | undefined,
  dependencyFocusActive: boolean,
  options?: EdgeAnimationOptions
): boolean {
  if (options?.preferReducedMotion) return false;

  const incidentToSelection =
    !!selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);

  if (options?.liteCanvas) {
    return incidentToSelection;
  }

  if (edge.animated) return true;
  if (dependencyFocusActive && selectedNodeId) return true;
  if (incidentToSelection) return true;
  return false;
}
