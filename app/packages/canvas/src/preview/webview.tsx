import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { CanvasPreview } from './CanvasPreview';

export function readBlueprintPayload(): { yaml: string; hotspots: boolean } {
  const blueprint = document.getElementById('blueprint');
  const yaml = blueprint?.textContent ? (JSON.parse(blueprint.textContent) as string) : '';
  return { yaml, hotspots: document.body.dataset.hotspots === 'on' };
}

const root = document.getElementById('root');
if (root) {
  const payload = readBlueprintPayload();
  createRoot(root).render(
    <StrictMode>
      <CanvasPreview yaml={payload.yaml} hotspots={payload.hotspots} />
    </StrictMode>
  );
}
