import { useEffect, useRef, useState } from 'react';
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

/** Property edits already refresh the in-memory YAML. Send that YAML to the open file. */
function useSyncBlueprintEdits(): void {
  useEffect(() => {
    let pending = 0;
    let last = useBlueprintStore.getState().yamlCode;
    const stop = useBlueprintStore.subscribe(state => {
      if (state.yamlCode === last) return;
      last = state.yamlCode;
      window.clearTimeout(pending);
      const yaml = state.yamlCode;
      pending = window.setTimeout(() => {
        extensionHost()?.postMessage({ type: 'sync', yaml });
      }, 200);
    });
    return () => {
      window.clearTimeout(pending);
      stop();
    };
  }, []);
}

/** The architecture map is the workspace page, loaded from one blueprint. */
export function CanvasPreview({
  yaml: initialYaml,
  hotspots: initialHotspots = false,
  blueprints = [],
}: {
  yaml: string;
  hotspots?: boolean;
  blueprints?: readonly PreviewBlueprint[];
}) {
  const [yaml, setYaml] = useState(initialYaml);
  const [hotspots, setHotspots] = useState(initialHotspots);
  useEffect(() => {
    extensionHost()?.postMessage({ type: 'ready' });
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: unknown; yaml?: unknown; hotspots?: unknown } | null;
      if (!data || data.type !== 'show' || typeof data.yaml !== 'string') return;
      setYaml(data.yaml);
      if (typeof data.hotspots === 'boolean') setHotspots(data.hotspots);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  const seen = useRef<string | null>(null);
  const catalogKey = useRef('');
  if (seen.current === null) {
    seen.current = yaml;
    useBlueprintStore.getState().importYaml(yaml);
    useBlueprintStore.setState({ isStartupOpen: false, isWorkspaceOpen: true });
  }
  useEffect(() => {
    if (seen.current === yaml) return;
    seen.current = yaml;
    useBlueprintStore.getState().importYaml(yaml);
    useBlueprintStore.setState({ isStartupOpen: false, isWorkspaceOpen: true });
  }, [yaml]);
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
  const seenHotspots = useRef<boolean | null>(null);
  if (seenHotspots.current === null) {
    seenHotspots.current = hotspots;
    if (useBlueprintStore.getState().showHotspotHeatmap !== hotspots) {
      useBlueprintStore.setState({ showHotspotHeatmap: hotspots });
    }
  }
  useEffect(() => {
    if (seenHotspots.current === hotspots) return;
    seenHotspots.current = hotspots;
    useBlueprintStore.setState({ showHotspotHeatmap: hotspots });
  }, [hotspots]);
  useSyncBlueprintEdits();

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
