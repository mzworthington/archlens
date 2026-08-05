import React, { useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, BackgroundVariant, Panel } from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../../application/store/store';
import { BlueprintNode } from './BlueprintNode';
import { BlueprintGroupNode } from './BlueprintGroupNode';
import { WorkspaceToolbar } from '../WorkspaceToolbar/WorkspaceToolbar';
import { resolveChildDiagramEntry } from '@archlens/core';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { useTraceLensOnboarding } from '../../hooks/useTraceLensOnboarding';
import { useActiveDiagramEntity } from '../../hooks/useActiveDiagramEntity';
import { useCouplingLens } from '../../../../../application/forensics/useCouplingLens';
import {
  includeExternalsInFocusFromMode,
  isDependencyFocusMode,
} from '../../../../../application/forensics/dependencyViewMode';
import { prefersReducedMotion } from '../../../../../application/store/layoutUtils';
import { useBlastRippleAnimation } from '../../../resilience/useBlastRippleAnimation';
import { DiagramLoadingOverlay } from './DiagramLoadingOverlay';
import { MermaidEnrichBanner } from './MermaidEnrichBanner';
import { SchemaImportErrorBanner } from './SchemaImportErrorBanner';
import { navigateToWorkspaceEntity } from '../../../../../application/navigation/navigateToWorkspaceEntity';
import {
  buildCanvasVisibleNodes,
  buildCanvasVisibleEdges,
  buildCanvasDisplayNodes,
  buildCanvasDisplayEdges,
} from './canvasDisplayGraph';
import { useCanvasLoadLayout } from './useCanvasLoadLayout';
import { useCanvasDropNode } from './useCanvasDropNode';
import { CanvasLensLegends } from './CanvasLensLegends';
import { CanvasTopLeftPanel } from './CanvasTopLeftPanel';
import { CanvasMiniMap } from './CanvasMiniMap';
import { DependencyFocusChip } from './DependencyFocusChip';
import { buildHiddenExternalConnectionGhosts } from '../../../../../application/forensics/hiddenExternalConnectionGhosts';
import { useSpotlightEdge } from './useSpotlightEdge';

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
    dependencyViewMode,
    setDependencyViewMode,
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
    expandedExternalHub,
    setExpandedExternalHub,
    expandExternalSummaryHub,
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
      dependencyViewMode: state.dependencyViewMode,
      setDependencyViewMode: state.setDependencyViewMode,
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
      expandedExternalHub: state.expandedExternalHub,
      setExpandedExternalHub: state.setExpandedExternalHub,
      expandExternalSummaryHub: state.expandExternalSummaryHub,
    }))
  );

  const externalSummaryContext = useMemo(
    () => ({
      schema,
      loadedSystems,
      allNodes: nodes,
      allEdges: edges,
      showUpstreamExternals,
      showDownstreamExternals,
      expandedExternalHub,
      dependencyViewMode,
    }),
    [
      schema,
      loadedSystems,
      nodes,
      edges,
      showUpstreamExternals,
      showDownstreamExternals,
      expandedExternalHub,
      dependencyViewMode,
    ]
  );

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

  useCanvasLoadLayout(currentFilePath, layoutSessionId, applyClientLayout);

  const simulationScopeSet = useMemo(() => {
    if (!isResilienceMode || !resilienceSimulationScope?.length) return null;
    return new Set(resilienceSimulationScope);
  }, [isResilienceMode, resilienceSimulationScope]);

  const filteredNodes = useMemo(
    () =>
      buildCanvasVisibleNodes({
        nodes,
        edges,
        schema,
        loadedSystems,
        showTests,
        showUpstreamExternals,
        showDownstreamExternals,
        selectedNodeId,
        dependencyViewMode,
        isResilienceMode,
        simulationScopeSet,
        showCoupling,
        expandedExternalHub,
      }),
    [
      nodes,
      edges,
      schema,
      loadedSystems,
      showTests,
      showUpstreamExternals,
      showDownstreamExternals,
      selectedNodeId,
      dependencyViewMode,
      isResilienceMode,
      simulationScopeSet,
      showCoupling,
      expandedExternalHub,
    ]
  );

  const filteredEdges = useMemo(
    () => buildCanvasVisibleEdges(edges, filteredNodes),
    [edges, filteredNodes]
  );

  const hiddenExternalGhosts = useMemo(
    () =>
      buildHiddenExternalConnectionGhosts({
        selectedNodeId,
        allNodes: nodes,
        allEdges: edges,
        visibleNodeIds: new Set(filteredNodes.map(node => node.id)),
        enabled:
          isDependencyFocusMode(dependencyViewMode) &&
          !includeExternalsInFocusFromMode(dependencyViewMode) &&
          !showCoupling &&
          !isResilienceMode &&
          !!selectedNodeId,
      }),
    [
      selectedNodeId,
      nodes,
      edges,
      filteredNodes,
      dependencyViewMode,
      showCoupling,
      isResilienceMode,
    ]
  );

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

  const displayNodes = useMemo(
    () =>
      buildCanvasDisplayNodes({
        filteredNodes,
        filteredEdges,
        focusedCyclePath,
        couplingFocusMode,
        selectedNodeId,
        dependencyViewMode,
        couplingGhostNodes,
        workspaceFilepathIndex,
        showCoupling,
        couplingRefs,
        guidedRefactorEntityRefs,
        showHotspotHeatmap,
        isResilienceMode,
        resilienceSafeguards,
        resilienceFaults,
        resilienceSimulationResult,
        resilienceSimulationScope,
        blastRipple,
        externalSummary: externalSummaryContext,
        hiddenExternalGhostNodes: hiddenExternalGhosts.ghostNodes,
      }),
    [
      filteredNodes,
      filteredEdges,
      focusedCyclePath,
      couplingFocusMode,
      selectedNodeId,
      dependencyViewMode,
      couplingGhostNodes,
      workspaceFilepathIndex,
      showCoupling,
      couplingRefs,
      guidedRefactorEntityRefs,
      showHotspotHeatmap,
      isResilienceMode,
      resilienceSafeguards,
      resilienceFaults,
      resilienceSimulationResult,
      resilienceSimulationScope,
      blastRipple,
      externalSummaryContext,
      hiddenExternalGhosts.ghostNodes,
    ]
  );

  const displayEdges = useMemo(
    () =>
      buildCanvasDisplayEdges({
        filteredEdges,
        filteredNodes,
        displayNodes,
        focusedCyclePath,
        couplingRefs,
        showCoupling,
        couplingGhostNodes,
        selectedNodeId,
        schemaDependencies: schema.dependencies ?? [],
        couplingFocusMode,
        showCouplingSchemaDeps,
        selectedEdgeId,
        edges,
        dependencyViewMode,
        liteCanvas,
        reduceMotion,
        isResilienceMode,
        propagationEdgeKeys: blastRipple.propagationEdgeKeys,
        externalSummary: externalSummaryContext,
        hiddenExternalGhostEdges: hiddenExternalGhosts.ghostEdges,
      }),
    [
      filteredEdges,
      filteredNodes,
      displayNodes,
      focusedCyclePath,
      couplingRefs,
      showCoupling,
      couplingGhostNodes,
      selectedNodeId,
      schema.dependencies,
      couplingFocusMode,
      showCouplingSchemaDeps,
      selectedEdgeId,
      edges,
      dependencyViewMode,
      liteCanvas,
      reduceMotion,
      isResilienceMode,
      blastRipple.propagationEdgeKeys,
      externalSummaryContext,
      hiddenExternalGhosts.ghostEdges,
    ]
  );

  useSpotlightEdge(selectedEdgeId, displayEdges, displayNodes);

  const { onDragOver, onDrop } = useCanvasDropNode(addNode);

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
          if (node.data?.externalSummaryHub) {
            const band = node.data.externalSummaryBand as 'callers' | 'targets' | undefined;
            if (!band) return;
            if (expandedExternalHub === band) {
              setExpandedExternalHub(null);
              selectNode(null);
              return;
            }
            expandExternalSummaryHub(band);
            selectNode(null);
            return;
          }
          setExpandedExternalHub(null);
          selectNode(node.id);
        }}
        onEdgeClick={(event, edge) => {
          event.stopPropagation();
          selectEdge(edge.id);
        }}
        onPaneClick={() => {
          selectNode(null);
          selectEdge(null);
          setExpandedExternalHub(null);
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

        <CanvasLensLegends
          isResilienceMode={isResilienceMode}
          resilienceSimulationResult={resilienceSimulationResult}
          liteCanvas={liteCanvas}
          showCoupling={showCoupling}
          couplingFocusMode={couplingFocusMode}
        />

        <CanvasTopLeftPanel parentEntityRef={parentEntityRef} onZoomOut={zoomOutToParent} />

        <DependencyFocusChip
          selectedNodeId={selectedNodeId}
          nodes={nodes}
          edges={edges}
          dependencyViewMode={dependencyViewMode}
          isResilienceMode={isResilienceMode}
          onSetViewMode={setDependencyViewMode}
        />

        <Panel
          position="bottom-center"
          style={{ zIndex: 100 }}
          className="mb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:mb-[max(1rem,env(safe-area-inset-bottom,0px))] !w-[calc(100%-1.5rem)] sm:!w-auto sm:!max-w-[min(56rem,calc(100%-1.5rem))] overflow-hidden bg-slate-950/90 border border-slate-900 px-3.5 py-2 rounded-xl shadow-lg shadow-black/40 backdrop-blur-md pointer-events-auto"
        >
          <WorkspaceToolbar />
        </Panel>

        {!liteCanvas && (
          <CanvasMiniMap
            showHotspotHeatmap={showHotspotHeatmap}
            isResilienceMode={isResilienceMode}
          />
        )}

        <SchemaImportErrorBanner error={lastError} onDismiss={clearError} />
        <MermaidEnrichBanner
          open={mermaidEnrichBannerOpen}
          onDismiss={() => setMermaidEnrichBannerOpen(false)}
        />
        <DiagramLoadingOverlay />
      </ReactFlow>
    </div>
  );
};
