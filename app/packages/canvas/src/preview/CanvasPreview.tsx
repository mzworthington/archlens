import { useRef } from 'react';
import { Router } from 'wouter';
import { buildWorkspaceCatalog, parseSchemaFromYaml } from '@archlens/core';
import { workspaceEntityRefFromPath } from '../application/navigation/workspaceUrl';
import { useBlueprintStore } from '../application/store/store';
import { ExtensionPreviewProvider } from '../ui/features/workspace/extensionPreview';
import { WorkspacePage } from '../ui/features/workspace/WorkspacePage';

type PreviewBlueprint = { name: string; content: string };

type WebviewHost = {
  postMessage: (message: unknown) => void;
};

function extensionHost(): WebviewHost | undefined {
  const host = window as Window & {
    acquireVsCodeApi?: () => WebviewHost;
    archlensVscode?: WebviewHost;
  };
  if (!host.archlensVscode && host.acquireVsCodeApi) {
    host.archlensVscode = host.acquireVsCodeApi();
  }
  return host.archlensVscode;
}

/** Double-click in the panel asks the extension to open that diagram. */
function previewNavigate(path: string): void {
  const entityRef = workspaceEntityRefFromPath(path);
  if (!entityRef) return;
  extensionHost()?.postMessage({ type: 'drill', entityRef });
}

/** Stay off `/workspace` so the site's demo bootstrap leaves this blueprint in place. */
function previewLocation(): [string, (path: string) => void] {
  return ['/preview', previewNavigate];
}

/** The architecture map is the workspace page, loaded from one blueprint. */
export function CanvasPreview({
  yaml,
  hotspots = false,
  blueprints = [],
}: {
  yaml: string;
  hotspots?: boolean;
  blueprints?: readonly PreviewBlueprint[];
}) {
  const seen = useRef('');
  const catalogKey = useRef('');
  if (seen.current !== yaml) {
    seen.current = yaml;
    useBlueprintStore.getState().importYaml(yaml);
    useBlueprintStore.setState({ isStartupOpen: false, isWorkspaceOpen: true });
  }
  const nextCatalogKey = blueprints.map(file => `${file.name}\0${file.content}`).join('\n');
  if (catalogKey.current !== nextCatalogKey && blueprints.length > 0) {
    catalogKey.current = nextCatalogKey;
    const loaded = blueprints.flatMap(file => {
      try {
        const schema = parseSchemaFromYaml(file.content);
        return [{ path: file.name, name: schema.name || file.name, schema }];
      } catch {
        return [];
      }
    });
    useBlueprintStore.setState({
      loadedSystems: loaded,
      workspaceCatalog: buildWorkspaceCatalog(
        loaded.map(file => ({ path: file.path, schema: file.schema }))
      ),
    });
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
