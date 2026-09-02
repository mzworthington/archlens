import React, { useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, BackgroundVariant, Panel } from '@xyflow/react';
import type { NodeTypes } from '@xyflow/react';
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
import { DiagramLoadingOverlay } from './DiagramLoadingOverlay';
import { EmptyDiagramOverlay } from './EmptyDiagramOverlay';
import { CollabCursors } from './CollabCursors';
import { useCollabCursorTracking } from './useCollabCursorTracking';
import { MermaidEnrichBanner } from './MermaidEnrichBanner';
import { BrowserLiteScanBanner } from './BrowserLiteScanBanner';
import { SchemaImportErrorBanner } from './SchemaImportErrorBanner';
import { navigateToWorkspaceEntity } from '../../../../../application/navigation/navigateToWorkspaceEntity';
import { useCanvasLoadLayout } from './useCanvasLoadLayout';
import { useCanvasDropNode } from './useCanvasDropNode';
import { useCanvasExternalSummary } from './useCanvasExternalSummary';
import { useCanvasDisplayGraph } from './useCanvasDisplayGraph';
import { CanvasLensLegends } from './CanvasLensLegends';
import { CanvasTopLeftPanel } from './CanvasTopLeftPanel';
import { CanvasMiniMap } from './CanvasMiniMap';
import { DependencyFocusChip } from './DependencyFocusChip';
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
    browserLiteBannerOpen,
    setBrowserLiteBannerOpen,
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
      browserLiteBannerOpen: state.browserLiteBannerOpen,
      setBrowserLiteBannerOpen: state.setBrowserLiteBannerOpen,
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

  const externalSummaryContext = useCanvasExternalSummary({
    schema,
    loadedSystems,
    nodes,
    edges,
    showUpstreamExternals,
    showDownstreamExternals,
    expandedExternalHub,
    dependencyViewMode,
  });

  const nodeTypes = useMemo(
    (): NodeTypes => ({
      blueprintNode: BlueprintNode,
      blueprintGroup: BlueprintGroupNode,
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

  const { displayNodes, displayEdges, couplingFocusMode } = useCanvasDisplayGraph({
    nodes,
    edges,
    schema,
    loadedSystems,
    showTests,
    showUpstreamExternals,
    showDownstreamExternals,
    selectedNodeId,
    selectedEdgeId,
    dependencyViewMode,
    isResilienceMode,
    resilienceSimulationScope,
    resilienceSafeguards,
    resilienceFaults,
    resilienceSimulationResult,
    showCoupling,
    showCouplingSchemaDeps,
    expandedExternalHub,
    focusedCyclePath,
    guidedRefactorEntityRefs,
    showHotspotHeatmap,
    liteCanvas,
    externalSummary: externalSummaryContext,
  });

  useSpotlightEdge(selectedEdgeId, displayEdges, displayNodes);

  const { onDragOver, onDrop } = useCanvasDropNode(addNode);
  const collabCursors = useBlueprintStore(s => s.collabPresence.cursors);
  const { onPointerMove, onPointerLeave } = useCollabCursorTracking();

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
          selectNode(node.id, { expandPanel: true });
          useBlueprintStore.getState().setRightPanelTab('properties');
          const entityRef = node.data?.entityRef as string | undefined;
          if (!entityRef || !resolveChildDiagramEntry(workspaceCatalog, entityRef)) return;
          navigateToWorkspaceEntity(entityRef, { workspaceCatalog, setLocation });
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        nodeTypes={nodeTypes}
        edgesFocusable
        elementsSelectable
        onlyRenderVisibleElements
        minZoom={0.05}
        maxZoom={4}
        fitView
        className="h-full"
      >
        <CollabCursors cursors={collabCursors} />
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

        <CanvasTopLeftPanel
          parentEntityRef={parentEntityRef}
          onZoomOut={zoomOutToParent}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onClearSelection={() => {
            selectNode(null);
            selectEdge(null);
          }}
        />

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
        <BrowserLiteScanBanner
          open={browserLiteBannerOpen}
          onDismiss={() => setBrowserLiteBannerOpen(false)}
        />
        <EmptyDiagramOverlay />
        <DiagramLoadingOverlay />
      </ReactFlow>
    </div>
  );
};
