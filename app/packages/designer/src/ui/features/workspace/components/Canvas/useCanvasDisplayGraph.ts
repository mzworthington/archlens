import { useCallback, useMemo } from 'react';
import type { EntityRef, LoadedSystemInput, SystemSchema } from '@archlens/core';
import type { ExternalSummaryBand } from '@archlens/core';
import type { NodeFaultConfig, NodeSafeguards, SimulationResult } from '@archlens/core/resilience';
import { useCouplingLens } from '../../../../../application/forensics/useCouplingLens';
import {
  includeExternalsInFocusFromMode,
  isDependencyFocusMode,
  type DependencyViewMode,
} from '../../../../../application/forensics/dependencyViewMode';
import {
  prefersReducedMotion,
  type BlueprintRFEdge,
  type BlueprintRFNode,
} from '../../../../../application/store/layoutUtils';
import { useBlastRippleAnimation } from '../../../resilience/useBlastRippleAnimation';
import { buildHiddenExternalConnectionGhosts } from '../../../../../application/forensics/hiddenExternalConnectionGhosts';
import {
  buildCanvasVisibleNodes,
  buildCanvasVisibleEdges,
  buildCanvasDisplayNodes,
  buildCanvasDisplayEdges,
} from './canvasDisplayGraph';
import type { CanvasExternalSummaryContext } from './canvasDisplayTypes';

export type UseCanvasDisplayGraphInput = {
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  schema: SystemSchema;
  loadedSystems: readonly LoadedSystemInput[];
  showTests: boolean;
  showUpstreamExternals: boolean;
  showDownstreamExternals: boolean;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  dependencyViewMode: DependencyViewMode;
  isResilienceMode: boolean;
  resilienceSimulationScope: EntityRef[] | null;
  resilienceSafeguards: Partial<Record<EntityRef, NodeSafeguards>>;
  resilienceFaults: NodeFaultConfig[];
  resilienceSimulationResult: SimulationResult | null;
  showCoupling: boolean;
  showCouplingSchemaDeps: boolean;
  expandedExternalHub: ExternalSummaryBand | null;
  focusedCyclePath: string[] | null;
  guidedRefactorEntityRefs: readonly string[] | null;
  showHotspotHeatmap: boolean;
  liteCanvas: boolean;
  externalSummary: CanvasExternalSummaryContext;
};

export type UseCanvasDisplayGraphResult = {
  displayNodes: BlueprintRFNode[];
  displayEdges: BlueprintRFEdge[];
  couplingFocusMode: boolean;
};

export function useCanvasDisplayGraph(
  input: UseCanvasDisplayGraphInput
): UseCanvasDisplayGraphResult {
  const {
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
    externalSummary,
  } = input;

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
        externalSummary,
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
      externalSummary,
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
        externalSummary,
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
      externalSummary,
      hiddenExternalGhosts.ghostEdges,
    ]
  );

  return { displayNodes, displayEdges, couplingFocusMode };
}
