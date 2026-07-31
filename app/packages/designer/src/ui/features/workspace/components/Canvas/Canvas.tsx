import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
  useReactFlow,
} from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../../application/store/store';
import { BlueprintNode } from './BlueprintNode';
import { BlueprintGroupNode } from './BlueprintGroupNode';
import { WorkspaceToolbar } from '../WorkspaceToolbar/WorkspaceToolbar';
import { AlertTriangle, X, ZoomOut } from 'lucide-react';
import { resolveChildDiagramEntry } from '@archlens/core';
import type { NodeType } from '@archlens/core';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { useTraceLensOnboarding } from '../../hooks/useTraceLensOnboarding';
import { useActiveDiagramEntity } from '../../hooks/useActiveDiagramEntity';
import {
  applyCouplingHighlights,
  applyRefactorBoundaryHighlights,
  buildCouplingOverlayEdges,
  buildCouplingSchemaDependencyEdges,
  filterCouplingFocusNodes,
} from '../../../../../application/forensics/buildCouplingOverlayEdges';
import { useCouplingLens } from '../../../../../application/forensics/useCouplingLens';
import { filterSelectedDependencyFocusNodes } from '../../../../../application/forensics/filterSelectedDependencyFocus';
import { shouldShowCanvasExternalNode } from '../../../../../application/forensics/externalNodeVisibility';
import {
  applyHotspotHeatmap,
  hotspotHeatmapMinimapColor,
} from '../../../../../application/forensics/hotspotHeatmap';
import {
  applyBlastHeatmap,
  blastHeatMinimapColor,
  integrityHeatMinimapColor,
} from '../../../../../application/resilience/blastHeatmap';
import { applySafeguardHighlights } from '../../../../../application/resilience/safeguardHighlights';
import { applySimulationScopeHighlights } from '../../../../../application/resilience/simulationScopeHighlights';
import { useBlastRippleAnimation } from '../../../../../application/resilience/useBlastRippleAnimation';
import { blastPropagationEdgeKey } from '../../../../../application/resilience/blastRipple';
import { ChaosLensLegend } from '../../../resilience/components/ChaosLensLegend';
import { CouplingLensLegend } from '../../../forensics/components/CouplingLensLegend';
import {
  DEPENDENCY_EDGE_STROKE,
  dependencyArrowMarker,
  prefersReducedMotion,
  shouldAnimateDependencyEdge,
  shouldAutoLayoutOnLoad,
} from '../../../../../application/store/layoutUtils';
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
import { DiagramLoadingOverlay } from './DiagramLoadingOverlay';
import { WorkspaceStatusBadges } from './WorkspaceStatusBadges';
import { navigateToWorkspaceEntity } from '../../../../../application/navigation/navigateToWorkspaceEntity';

export const Canvas: React.FC = () => {
  const [, setLocation] = useLocation();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    selectedNodeId,
    selectEdge,
    selectedEdgeId,
    lastError,
    clearError,
    showTests,
    showUpstreamExternals,
    showDownstreamExternals,
    showSelectedDependenciesOnly,
    showCoupling,
    showCouplingSchemaDeps,
    guidedRefactorEntityRefs,
    showHotspotHeatmap,
    liteCanvas,
    isResilienceMode,
    resilienceSimulationResult,
    resilienceSafeguards,
    resilienceFaults,
    resilienceSimulationScope,
    focusedCyclePath,
    workspaceCatalog,
    loadedSystems,
    schema,
    currentFilePath,
    mermaidEnrichBannerOpen,
    setMermaidEnrichBannerOpen,
    applyClientLayout,
    layoutSessionId,
    undo,
    redo,
    recordHistory,
    addNode,
  } = useBlueprintStore(
    useShallow(state => ({
      nodes: state.nodes,
      edges: state.edges,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      onConnect: state.onConnect,
      selectNode: state.selectNode,
      selectedNodeId: state.selectedNodeId,
      selectEdge: state.selectEdge,
      selectedEdgeId: state.selectedEdgeId,
      lastError: state.lastError,
      clearError: state.clearError,
      showTests: state.showTests,
      showUpstreamExternals: state.showUpstreamExternals,
      showDownstreamExternals: state.showDownstreamExternals,
      showSelectedDependenciesOnly: state.showSelectedDependenciesOnly,
      showCoupling: state.showCoupling,
      showCouplingSchemaDeps: state.showCouplingSchemaDeps,
      guidedRefactorEntityRefs: state.guidedRefactorEntityRefs,
      showHotspotHeatmap: state.showHotspotHeatmap,
      liteCanvas: state.liteCanvas,
      isResilienceMode: state.isResilienceMode,
      resilienceSimulationResult: state.resilienceSimulationResult,
      resilienceSafeguards: state.resilienceSafeguards,
      resilienceFaults: state.resilienceFaults,
      resilienceSimulationScope: state.resilienceSimulationScope,
      focusedCyclePath: state.focusedCyclePath,
      workspaceCatalog: state.workspaceCatalog,
      loadedSystems: state.loadedSystems,
      schema: state.schema,
      currentFilePath: state.currentFilePath,
      mermaidEnrichBannerOpen: state.mermaidEnrichBannerOpen,
      setMermaidEnrichBannerOpen: state.setMermaidEnrichBannerOpen,
      applyClientLayout: state.applyClientLayout,
      layoutSessionId: state.layoutSessionId,
      undo: state.undo,
      redo: state.redo,
      recordHistory: state.recordHistory,
      addNode: state.addNode,
    }))
  );

  const { fitView } = useReactFlow();
  const fitViewRef = useRef(fitView);
  fitViewRef.current = fitView;

  const nodeTypes = useMemo(
    () => ({
      blueprintNode: BlueprintNode as any,
      blueprintGroup: BlueprintGroupNode as any,
    }),
    []
  );

  const { parentEntityRef } = useActiveDiagramEntity();

  const zoomOutToParent = useCallback(() => {
    if (!parentEntityRef) return;
    navigateToWorkspaceEntity(parentEntityRef, { workspaceCatalog, setLocation });
  }, [parentEntityRef, workspaceCatalog, setLocation]);

  useKeyboardNavigation({
    onZoomOut: parentEntityRef ? zoomOutToParent : undefined,
    onUndo: undo,
    onRedo: redo,
  });

  useTraceLensOnboarding();

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
          fitViewRef.current({ padding: 0.12 });
        });
      });
    };

    void run();
    return () => controller.abort();
  }, [currentFilePath, layoutSessionId, applyClientLayout]);

  const simulationScopeSet = useMemo(() => {
    if (!isResilienceMode || !resilienceSimulationScope?.length) return null;
    return new Set(resilienceSimulationScope);
  }, [isResilienceMode, resilienceSimulationScope]);

  const filteredNodes = useMemo(() => {
    const base = nodes.filter(n => {
      if (!showTests && n.data.isTest) return false;
      const entityRef = (n.data.entityRef ?? n.id) as string;
      const forceShowScope =
        simulationScopeSet && (simulationScopeSet.has(entityRef) || simulationScopeSet.has(n.id));
      if (
        n.data.external &&
        !forceShowScope &&
        !shouldShowCanvasExternalNode(
          n.id,
          nodes,
          edges,
          showUpstreamExternals,
          showDownstreamExternals
        )
      ) {
        return false;
      }
      return true;
    });
    const visibleIds = new Set(base.map(n => n.id));
    const baseEdges = edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));
    return filterSelectedDependencyFocusNodes(
      base,
      baseEdges,
      selectedNodeId,
      showSelectedDependenciesOnly && !isResilienceMode
    );
  }, [
    nodes,
    edges,
    showTests,
    showUpstreamExternals,
    showDownstreamExternals,
    selectedNodeId,
    showSelectedDependenciesOnly,
    isResilienceMode,
    simulationScopeSet,
  ]);

  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    return edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [edges, filteredNodes]);

  const reduceMotion = prefersReducedMotion();

  const entityRefToNodeId = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of nodes) {
      const ref = (n.data.entityRef ?? n.id) as string;
      map.set(ref, n.id);
    }
    return map;
  }, [nodes]);

  const nodeIdForEntityRef = useCallback(
    (entityRef: string) => entityRefToNodeId.get(entityRef),
    [entityRefToNodeId]
  );

  const blastRipple = useBlastRippleAnimation(
    isResilienceMode ? resilienceSimulationResult : null,
    {
      enabled: isResilienceMode && !!resilienceSimulationResult,
      preferReducedMotion: reduceMotion,
      liteCanvas,
      edges: filteredEdges,
      nodeIdForEntityRef,
    }
  );

  const { workspaceFilepathIndex, couplingFocusMode, couplingRefs, couplingGhostNodes } =
    useCouplingLens({
      showCoupling,
      selectedNodeId,
      nodes: filteredNodes,
      loadedSystems,
    });

  const displayNodes = useMemo(() => {
    let baseNodes = filteredNodes;
    if (focusedCyclePath) {
      const cycleSet = new Set(focusedCyclePath);
      baseNodes = baseNodes.filter(n => cycleSet.has(n.id));
    }
    const focused = couplingFocusMode
      ? filterCouplingFocusNodes(
          baseNodes,
          selectedNodeId,
          true,
          couplingGhostNodes,
          workspaceFilepathIndex
        )
      : baseNodes;
    const withCoupling = applyCouplingHighlights(
      focused,
      selectedNodeId,
      showCoupling,
      workspaceFilepathIndex,
      couplingRefs
    );
    const withBoundary = applyRefactorBoundaryHighlights(withCoupling, guidedRefactorEntityRefs);
    const withHotspot = applyHotspotHeatmap(withBoundary, showHotspotHeatmap);
    const withSafeguards = applySafeguardHighlights(withHotspot, {
      enabled: isResilienceMode,
      sessionSafeguards: resilienceSafeguards,
    });
    const faultTargets = resilienceFaults.map(fault => fault.nodeId);
    const withBlast = applyBlastHeatmap(withSafeguards, blastRipple.animatedHeat, {
      enabled: isResilienceMode && (!!resilienceSimulationResult || faultTargets.length > 0),
      integrityHeat: resilienceSimulationResult?.integrityHeat,
      spofs: resilienceSimulationResult?.spofs,
      faultTargets,
      ripplingNodes: blastRipple.ripplingNodes,
    });
    return applySimulationScopeHighlights(withBlast, {
      enabled: isResilienceMode && !!resilienceSimulationScope?.length,
      scope: resilienceSimulationScope,
    });
  }, [
    filteredNodes,
    selectedNodeId,
    showCoupling,
    couplingFocusMode,
    couplingRefs,
    couplingGhostNodes,
    workspaceFilepathIndex,
    guidedRefactorEntityRefs,
    showHotspotHeatmap,
    isResilienceMode,
    resilienceSimulationResult,
    resilienceSafeguards,
    resilienceFaults,
    resilienceSimulationScope,
    focusedCyclePath,
    blastRipple.animatedHeat,
    blastRipple.ripplingNodes,
  ]);

  const displayEdges = useMemo(() => {
    if (focusedCyclePath) {
      return filteredEdges.filter(e => {
        for (let i = 0; i < focusedCyclePath.length - 1; i++) {
          if (focusedCyclePath[i] === e.source && focusedCyclePath[i + 1] === e.target) {
            return true;
          }
        }
        return false;
      });
    }
    const couplingEdges = buildCouplingOverlayEdges(
      filteredNodes,
      couplingRefs,
      showCoupling,
      couplingGhostNodes
    );
    const schemaDepEdges = buildCouplingSchemaDependencyEdges(
      selectedNodeId,
      filteredNodes,
      couplingGhostNodes,
      schema.dependencies ?? [],
      couplingRefs,
      couplingFocusMode,
      showCouplingSchemaDeps
    );
    if (couplingFocusMode && (couplingEdges.length > 0 || schemaDepEdges.length > 0)) {
      return [...couplingEdges, ...schemaDepEdges];
    }

    const visibleNodeIds = new Set(displayNodes.map(n => n.id));
    let next = filteredEdges.filter(
      e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );

    if (selectedEdgeId && !next.some(e => e.id === selectedEdgeId)) {
      const selected = edges.find(e => e.id === selectedEdgeId);
      if (selected) next = [...next, selected];
    }

    const animationOpts = { liteCanvas, preferReducedMotion: reduceMotion };
    const propagationKeys = blastRipple.propagationEdgeKeys;

    const styled = next.map(e => {
      const isSelected = e.id === selectedEdgeId;
      const isPropagationRipple =
        isResilienceMode &&
        (propagationKeys.has(e.id) ||
          propagationKeys.has(blastPropagationEdgeKey(e.source, e.target)));
      const stroke = isPropagationRipple
        ? '#f87171'
        : isSelected
          ? '#00f0ff'
          : ((e.style?.stroke as string | undefined) ?? DEPENDENCY_EDGE_STROKE);
      return {
        ...e,
        selected: isSelected,
        animated:
          isPropagationRipple ||
          shouldAnimateDependencyEdge(
            e,
            selectedNodeId,
            showSelectedDependenciesOnly,
            animationOpts
          ),
        className: isPropagationRipple
          ? 'blast-propagation-edge'
          : typeof e.className === 'string'
            ? e.className
            : undefined,
        markerEnd: dependencyArrowMarker(stroke),
        style: {
          ...e.style,
          stroke,
          strokeWidth: isSelected ? 3 : ((e.style?.strokeWidth as number | undefined) ?? 2),
        },
      };
    });

    if (showCoupling && couplingEdges.length > 0) {
      return [...styled, ...couplingEdges];
    }

    return styled;
  }, [
    filteredEdges,
    filteredNodes,
    displayNodes,
    selectedNodeId,
    selectedEdgeId,
    showCoupling,
    showCouplingSchemaDeps,
    couplingFocusMode,
    couplingRefs,
    couplingGhostNodes,
    schema.dependencies,
    showSelectedDependenciesOnly,
    focusedCyclePath,
    edges,
    liteCanvas,
    reduceMotion,
    isResilienceMode,
    blastRipple.propagationEdgeKeys,
  ]);

  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [screenToFlowPosition, addNode]
  );

  return (
    <div className="flex-1 h-full relative">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(event, node) => {
          event.stopPropagation();
          selectNode(node.id);
        }}
        onEdgeClick={(event, edge) => {
          event.stopPropagation();
          selectEdge(edge.id);
        }}
        onPaneClick={() => {
          selectNode(null);
          selectEdge(null);
        }}
        onNodeDragStart={() => recordHistory()}
        onNodeDoubleClick={(_, node) => {
          const entityRef = node.data?.entityRef as string | undefined;
          if (!entityRef || !resolveChildDiagramEntry(workspaceCatalog, entityRef)) return;
          navigateToWorkspaceEntity(entityRef, { workspaceCatalog, setLocation });
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgesFocusable
        elementsSelectable
        onlyRenderVisibleElements
        minZoom={0.05}
        maxZoom={4}
        fitView
        className="h-full"
      >
        {!liteCanvas && (
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#334155" />
        )}
        <Controls position="top-right" />

        {isResilienceMode && resilienceSimulationResult && !liteCanvas ? (
          <Panel position="top-right" className="!mt-14 !mr-4 pointer-events-none">
            <ChaosLensLegend />
          </Panel>
        ) : null}

        {showCoupling && !liteCanvas && !isResilienceMode ? (
          <Panel position="top-right" className="!mt-14 !mr-4 pointer-events-none">
            <CouplingLensLegend focusMode={couplingFocusMode} />
          </Panel>
        ) : null}

        <Panel position="top-left" className="m-4 flex flex-col items-start gap-2">
          <WorkspaceStatusBadges />
          {parentEntityRef ? (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                zoomOutToParent();
              }}
              className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 hover:border-brand-500/40 hover:bg-slate-900 text-slate-200 hover:text-brand-300 px-3 py-1.5 rounded-xl shadow-lg shadow-black/40 backdrop-blur-md text-xs font-semibold transition cursor-pointer"
              title="Zoom out to parent diagram (Esc)"
              data-testid="zoom-out-button"
            >
              <ZoomOut className="w-3.5 h-3.5" />
              <span>Zoom out</span>
              <kbd className="hidden sm:inline ml-1 text-[9px] font-mono text-slate-300 bg-slate-900 border border-slate-700 rounded px-1 py-0.5">
                Esc
              </kbd>
            </button>
          ) : null}
        </Panel>

        <Panel
          position="bottom-center"
          style={{ zIndex: 100 }}
          className="mb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:mb-[max(1rem,env(safe-area-inset-bottom,0px))] !w-[calc(100%-1.5rem)] sm:!w-auto sm:!max-w-[min(56rem,calc(100%-1.5rem))] overflow-hidden bg-slate-950/90 border border-slate-900 px-3.5 py-2 rounded-xl shadow-lg shadow-black/40 backdrop-blur-md pointer-events-auto"
        >
          <WorkspaceToolbar />
        </Panel>

        {!liteCanvas && (
          <div className="hidden md:block">
            <MiniMap
              position="bottom-left"
              bgColor="#0f172a"
              nodeColor={n => {
                if (n.type !== 'blueprintNode') return '#1e293b';

                const hotspotHeat =
                  typeof n.data?.hotspotHeat === 'number' ? n.data.hotspotHeat : 0;
                const blastHeat = typeof n.data?.blastHeat === 'number' ? n.data.blastHeat : 0;
                const integrityHeat =
                  typeof n.data?.integrityHeat === 'number' ? n.data.integrityHeat : 0;

                if (showHotspotHeatmap && hotspotHeat > 0) {
                  const heatColor = hotspotHeatmapMinimapColor(hotspotHeat);
                  if (heatColor) return heatColor;
                }
                if (isResilienceMode) {
                  if (blastHeat > 0) return blastHeatMinimapColor(blastHeat);
                  if (integrityHeat > 0) return integrityHeatMinimapColor(integrityHeat);
                }
                if (n.data?.type === 'relational-database') return '#06b6d4';
                if (n.data?.type === 'event-broker') return '#a855f7';
                if (n.data?.type === 'grpc-service') return '#3b82f6';
                if (n.data?.type === 'serverless-function') return '#eab308';
                if (n.data?.type === 'rest-api') return '#10b981';
                if (n.data?.type === 'cache-store') return '#f97316';
                return '#1e293b';
              }}
              maskColor="rgba(15, 23, 42, 0.6)"
              className="border border-slate-800 rounded-lg overflow-hidden"
              style={{ width: 120, height: 90 }}
            />
          </div>
        )}

        {lastError && (
          <Panel position="top-center" className="m-4 max-w-md w-full animate-bounce-short">
            <div className="flex items-start gap-3 bg-red-950/90 border border-red-900/50 px-4 py-3 rounded-xl shadow-2xl shadow-red-950/40 backdrop-blur-md text-red-200 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1">
                <h5 className="font-bold text-red-300 mb-0.5">Schema Import Failed</h5>
                <p className="leading-relaxed whitespace-pre-wrap">{lastError}</p>
              </div>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-200 transition text-[10px] font-bold uppercase tracking-wider ml-2 shrink-0 self-center border border-red-900/40 hover:border-red-900/80 rounded px-1.5 py-0.5 bg-red-950/60"
              >
                Dismiss
              </button>
            </div>
          </Panel>
        )}

        {mermaidEnrichBannerOpen ? (
          <Panel position="top-center" className="m-4 max-w-lg w-full z-50">
            <div
              className="flex items-start gap-3 border border-amber-500/30 bg-amber-950/90 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md text-amber-100 text-xs"
              data-testid="mermaid-enrich-banner"
            >
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <h5 className="font-bold text-amber-200">Mermaid import is lossy</h5>
                <p className="leading-relaxed text-amber-100/90">
                  Forensics and nested subgraphs are not preserved. Re-run an ArchLens scan to
                  enrich YAML with git metrics and coupling data.
                </p>
                <a
                  href="/guide/cli"
                  className="inline-flex text-[10px] font-mono font-semibold text-[#00f0ff] hover:underline"
                >
                  See CLI scan guide
                </a>
              </div>
              <button
                type="button"
                onClick={() => setMermaidEnrichBannerOpen(false)}
                className="text-amber-300 hover:text-amber-100 transition shrink-0 p-0.5 rounded hover:bg-white/10"
                aria-label="Dismiss enrich banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </Panel>
        ) : null}
        <DiagramLoadingOverlay />
      </ReactFlow>
    </div>
  );
};
