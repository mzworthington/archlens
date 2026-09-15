import { getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import type { BlueprintRFNode } from '../store/layoutUtils';

const IMAGE_WIDTH = 1920;
const IMAGE_HEIGHT = 1080;

export type DiagramImageFormat = 'png' | 'svg';

function downloadDataUrl(dataUrl: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

function safeDownloadStem(name: string): string {
  const parts: string[] = [];
  let token = '';
  for (const ch of name) {
    const code = ch.charCodeAt(0);
    const ok =
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      ch === '_' ||
      ch === '.' ||
      ch === '-';
    if (ok) {
      token += ch;
    } else if (token) {
      parts.push(token);
      token = '';
    }
  }
  if (token) parts.push(token);
  return parts.join('-');
}

/**
 * Export the visible React Flow diagram to PNG or SVG for decks and docs.
 */
export async function exportCanvasImage(
  viewportElement: HTMLElement,
  nodes: BlueprintRFNode[],
  format: DiagramImageFormat,
  diagramName: string
): Promise<void> {
  const bounds = getNodesBounds(nodes);
  if (!bounds.width || !bounds.height) {
    throw new Error('Nothing to export - add nodes to the diagram first.');
  }

  const viewport = getViewportForBounds(bounds, IMAGE_WIDTH, IMAGE_HEIGHT, 0.1, 2, 0.15);

  const filter = (node: HTMLElement) => {
    const classList = node.classList;
    if (classList?.contains('react-flow__minimap')) return false;
    if (classList?.contains('react-flow__controls')) return false;
    if (classList?.contains('react-flow__panel')) return false;
    return true;
  };

  const options = {
    backgroundColor: '#0f172a',
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    style: {
      width: `${IMAGE_WIDTH}px`,
      height: `${IMAGE_HEIGHT}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
    filter,
  };

  const safeName = safeDownloadStem(diagramName) || 'diagram';

  if (format === 'svg') {
    const dataUrl = await toSvg(viewportElement, options);
    downloadDataUrl(dataUrl, `${safeName}.svg`);
    return;
  }

  const dataUrl = await toPng(viewportElement, { ...options, pixelRatio: 2 });
  downloadDataUrl(dataUrl, `${safeName}.png`);
}
