import { describe, expect, it } from 'vitest';
import { BLANK_CANVAS_ZOOM, formatZoomPercent, viewportForLoadedDiagram } from './diagramViewport';

describe('viewportForLoadedDiagram', () => {
  it('zooms an empty canvas out instead of fitting a vacant view', () => {
    expect(viewportForLoadedDiagram(0)).toEqual({ kind: 'blank', zoom: BLANK_CANVAS_ZOOM });
    expect(BLANK_CANVAS_ZOOM).toBeLessThan(1);
  });

  it('fits populated diagrams without zooming a single node to maxZoom', () => {
    expect(viewportForLoadedDiagram(1)).toEqual({
      kind: 'fit',
      padding: 0.12,
      maxZoom: 1.15,
    });
    expect(viewportForLoadedDiagram(12)).toEqual({
      kind: 'fit',
      padding: 0.12,
      maxZoom: 1.15,
    });
  });
});

describe('formatZoomPercent', () => {
  it('rounds React Flow zoom to a whole percent', () => {
    expect(formatZoomPercent(0.55)).toBe('55%');
    expect(formatZoomPercent(1)).toBe('100%');
    expect(formatZoomPercent(1.249)).toBe('125%');
  });
});
