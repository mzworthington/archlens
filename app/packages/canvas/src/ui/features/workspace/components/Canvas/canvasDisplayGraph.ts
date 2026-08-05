/** Re-export surface for canvas display graph builders (stable Canvas.tsx imports). */
export type { CanvasVisibleNodesInput } from './canvasVisibleGraph';
export { buildCanvasVisibleNodes, buildCanvasVisibleEdges } from './canvasVisibleGraph';

export type {
  CanvasExternalSummaryContext,
  CanvasDisplayNodesInput,
  CanvasDisplayEdgesInput,
} from './canvasDisplayTypes';

export { buildCanvasDisplayNodes } from './canvasDisplayNodes';
export { buildCanvasDisplayEdges } from './canvasDisplayEdges';
export { getCanvasMiniMapNodeColor } from './canvasMiniMapNodeColor';
