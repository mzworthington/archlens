/** Zoom for an empty sketching canvas - enough grid in view, not a close-up. */
export const BLANK_CANVAS_ZOOM = 0.55;

const FIT_VIEW_PADDING = 0.12;

/** Cap how far fit-view may zoom in; zooming out for large graphs is uncapped. */
const FIT_VIEW_MAX_ZOOM = 1.15;

export type LoadedDiagramViewport =
  { kind: 'blank'; zoom: number } | { kind: 'fit'; padding: number; maxZoom: number };

export function viewportForLoadedDiagram(nodeCount: number): LoadedDiagramViewport {
  if (nodeCount === 0) {
    return { kind: 'blank', zoom: BLANK_CANVAS_ZOOM };
  }
  return { kind: 'fit', padding: FIT_VIEW_PADDING, maxZoom: FIT_VIEW_MAX_ZOOM };
}

/** Whole-percent label for the canvas zoom control (1.0 → `100%`). */
export function formatZoomPercent(zoom: number): string {
  if (!Number.isFinite(zoom)) return '100%';
  return `${Math.round(zoom * 100)}%`;
}
