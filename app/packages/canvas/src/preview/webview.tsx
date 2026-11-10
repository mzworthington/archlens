import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { CanvasPreview } from './CanvasPreview';

type PreviewBlueprint = { name: string; content: string };

export function readBlueprintPayload(): {
  yaml: string;
  hotspots: boolean;
  blueprints: PreviewBlueprint[];
} {
  const blueprint = document.getElementById('blueprint');
  const yaml = blueprint?.textContent ? (JSON.parse(blueprint.textContent) as string) : '';
  const listed = document.getElementById('blueprints');
  const blueprints = listed?.textContent
    ? (JSON.parse(listed.textContent) as PreviewBlueprint[])
    : [];
  return { yaml, hotspots: document.body.dataset.hotspots === 'on', blueprints };
}

const root = document.getElementById('root');
if (root) {
  const payload = readBlueprintPayload();
  createRoot(root).render(
    <StrictMode>
      <CanvasPreview
        yaml={payload.yaml}
        hotspots={payload.hotspots}
        blueprints={payload.blueprints}
      />
    </StrictMode>
  );
}
