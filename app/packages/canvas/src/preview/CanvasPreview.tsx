import { useRef } from 'react';
import { Router } from 'wouter';
import { useBlueprintStore } from '../application/store/store';
import { ExtensionPreviewProvider } from '../ui/features/workspace/extensionPreview';
import { WorkspacePage } from '../ui/features/workspace/WorkspacePage';

/** Stay off `/workspace` so the site's demo bootstrap leaves this blueprint in place. */
function previewLocation(): [string, (path: string) => void] {
  return ['/preview', () => undefined];
}

/** The architecture map is the workspace page, loaded from one blueprint. */
export function CanvasPreview({ yaml, hotspots = false }: { yaml: string; hotspots?: boolean }) {
  const seen = useRef('');
  if (seen.current !== yaml) {
    seen.current = yaml;
    useBlueprintStore.getState().importYaml(yaml);
    useBlueprintStore.setState({ isStartupOpen: false, isWorkspaceOpen: true });
  }
  if (useBlueprintStore.getState().showHotspotHeatmap !== hotspots) {
    useBlueprintStore.setState({ showHotspotHeatmap: hotspots });
  }

  return (
    <div className="h-screen w-screen">
      <Router hook={previewLocation}>
        <ExtensionPreviewProvider>
          <WorkspacePage />
        </ExtensionPreviewProvider>
      </Router>
    </div>
  );
}
