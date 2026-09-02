import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useBlueprintStore } from '../../../../../application/store/store';
import {
  hasSessionLayout,
  schemaLayoutFingerprint,
} from '../../../../../application/store/sessionLayoutCache';
import {
  beginDiagramLoad,
  DIAGRAM_LAYOUT_MESSAGE,
  endDiagramLoad,
} from '../../../../../application/store/diagramLoadSession';
import { yieldToUi } from '../../../../../application/store/yieldToUi';
import { shouldAutoLayoutOnLoad } from '../../../../../application/store/layoutUtils';
import { viewportForLoadedDiagram } from '../../../../../application/canvas/diagramViewport';

export function useCanvasLoadLayout(
  currentFilePath: string,
  layoutSessionId: number,
  applyClientLayout: (options?: {
    signal?: AbortSignal;
    persistToSchema?: boolean;
    recordHistory?: boolean;
    engine?: import('../../../../../core').LayoutEngineId;
  }) => Promise<void>
): void {
  const { fitView, setViewport } = useReactFlow();
  const fitViewRef = useRef(fitView);
  const setViewportRef = useRef(setViewport);
  fitViewRef.current = fitView;
  setViewportRef.current = setViewport;

  useEffect(() => {
    const controller = new AbortController();
    const layoutSessionAtStart = layoutSessionId;
    const filePathAtStart = currentFilePath;

    const run = async () => {
      const { schema, currentFilePath: activePath } = useBlueprintStore.getState();
      const fingerprint = schemaLayoutFingerprint(schema);
      const needsLayout =
        shouldAutoLayoutOnLoad(schema) && !hasSessionLayout(activePath, fingerprint);

      let layoutStarted = false;
      try {
        if (needsLayout) {
          beginDiagramLoad(
            () => useBlueprintStore.getState(),
            partial => useBlueprintStore.setState(partial),
            DIAGRAM_LAYOUT_MESSAGE
          );
          layoutStarted = true;
          await yieldToUi();
          const { layoutEngine: currentEngine } = useBlueprintStore.getState();
          if (currentEngine !== 'dagre') {
            useBlueprintStore.setState({ layoutEngine: 'dagre' });
          }
          await applyClientLayout({
            signal: controller.signal,
            engine: 'dagre',
            recordHistory: false,
          });
        }
      } finally {
        if (layoutStarted) {
          endDiagramLoad(
            () => useBlueprintStore.getState(),
            partial => useBlueprintStore.setState(partial)
          );
        }
      }

      const stillCurrent =
        useBlueprintStore.getState().layoutSessionId === layoutSessionAtStart &&
        useBlueprintStore.getState().currentFilePath === filePathAtStart;
      if (!stillCurrent || controller.signal.aborted) return;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const nodeCount = useBlueprintStore.getState().schema.nodes.length;
          const viewport = viewportForLoadedDiagram(nodeCount);
          if (viewport.kind === 'blank') {
            void setViewportRef.current?.({ x: 0, y: 0, zoom: viewport.zoom });
            return;
          }
          fitViewRef.current({ padding: viewport.padding, maxZoom: viewport.maxZoom });
        });
      });
    };

    void run();
    return () => controller.abort();
  }, [currentFilePath, layoutSessionId, applyClientLayout]);
}
