import type {
  EntityRef,
  LoadedSystemInput,
  SystemDependency,
  SystemSchema,
  WorkspaceFilepathIndex,
} from '@archlens/core';
import type { ExternalSummaryBand } from '@archlens/core';
import type { NodeSafeguards, SimulationResult, NodeFaultConfig } from '@archlens/core/resilience';
import {
  applyCouplingHighlights,
  applyRefactorBoundaryHighlights,
  buildCouplingOverlayEdges,
  buildCouplingSchemaDependencyEdges,
  filterCouplingFocusNodes,
} from '../../../../../application/forensics/buildCouplingOverlayEdges';
import {
  filterSelectedDependencyFocusNodes,
  collectDependencyNeighborhoodWithExternals,
} from '../../../../../application/forensics/filterSelectedDependencyFocus';
import { applyDependencyHighlights } from '../../../../../application/forensics/applyDependencyHighlights';
import { shouldShowCanvasExternalNode } from '../../../../../application/forensics/externalNodeVisibility';
import {
  buildExternalSummaryHubEdges,
  buildExternalSummaryHubNodes,
  hiddenOverviewExternalRefs,
  resolveOverviewExternalBands,
  resolveVisibleExternalEntityRefs,
  stripExternalIndividualEdges,
} from '../../../../../application/forensics/externalSummaryDisplay';
import { applyHotspotHeatmap } from '../../../../../application/forensics/hotspotHeatmap';
import type { CouplingEdgeRef } from '../../../../../application/forensics/resolveCouplingEdges';
import {
  applyBlastHeatmap,
  blastHeatMinimapColor,
  integrityHeatMinimapColor,
} from '../../../../../application/resilience/blastHeatmap';
import { applySafeguardHighlights } from '../../../../../application/resilience/safeguardHighlights';
import { applySimulationScopeHighlights } from '../../../../../application/resilience/simulationScopeHighlights';
import type { BlastRippleFrame } from '../../../../../application/resilience/blastRipple';
import { blastPropagationEdgeKey } from '../../../../../application/resilience/blastRipple';
import {
  DEPENDENCY_EDGE_STROKE,
  dependencyArrowMarker,
  shouldAnimateDependencyEdge,
} from '../../../../../application/store/layoutUtils';
import { hotspotHeatmapMinimapColor } from '../../../../../application/forensics/hotspotHeatmap';
import type {
  BlueprintRFEdge,
  BlueprintRFNode,
} from '../../../../../application/store/layoutUtils';
import type { Node as RFNode } from '@xyflow/react';

export type CanvasVisibleNodesInput = {
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  schema: SystemSchema;
  loadedSystems: readonly LoadedSystemInput[];
  showTests: boolean;
  showUpstreamExternals: boolean;
  showDownstreamExternals: boolean;
  selectedNodeId: string | null;
  showSelectedDependenciesOnly: boolean;
  includeExternalsInFocus: boolean;
  isResilienceMode: boolean;
  simulationScopeSet: Set<string> | null;
  showCoupling: boolean;
  expandedExternalHub: ExternalSummaryBand | null;
};

export function buildCanvasVisibleNodes({
  nodes,
  edges,
  schema,
  loadedSystems,
  showTests,
  showUpstreamExternals,
  showDownstreamExternals,
  selectedNodeId,
  showSelectedDependenciesOnly,
  includeExternalsInFocus,
  isResilienceMode,
  simulationScopeSet,
  showCoupling,
  expandedExternalHub,
}: CanvasVisibleNodesInput): BlueprintRFNode[] {
  const focusActive = showSelectedDependenciesOnly && !isResilienceMode && !!selectedNodeId;

  if (focusActive && includeExternalsInFocus) {
    const candidates = nodes.filter(n => showTests || !n.data.isTest);
    const closure = collectDependencyNeighborhoodWithExternals(
      selectedNodeId,
      candidates,
      edges,
      true
    );
    return candidates.filter(n => {
      if (closure.has(n.id)) return true;
      const entityRef = (n.data.entityRef ?? n.id) as string;
      return !!(
        simulationScopeSet &&
        (simulationScopeSet.has(entityRef) || simulationScopeSet.has(n.id))
      );
    });
  }

  const summaryInput = {
    nodes,
    edges,
    schema,
    loadedSystems,
    selectedNodeId,
    showCallers: showUpstreamExternals,
    showTargets: showDownstreamExternals,
    expandedBand: expandedExternalHub,
    showCoupling,
    isResilienceMode,
    includeExternalsInFocus,
  };
  const visibleExternalRefs = resolveVisibleExternalEntityRefs(summaryInput);

  const base = nodes.filter(n => {
    if (!showTests && n.data.isTest) return false;
    const entityRef = (n.data.entityRef ?? n.id) as string;
    const forceShowScope =
      simulationScopeSet && (simulationScopeSet.has(entityRef) || simulationScopeSet.has(n.id));
    if (n.data.external && visibleExternalRefs !== null) {
      if (forceShowScope) return true;
      return visibleExternalRefs.has(entityRef);
    }
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
  return filterSelectedDependencyFocusNodes(base, baseEdges, selectedNodeId, focusActive, false);
}

export function buildCanvasVisibleEdges(
  edges: BlueprintRFEdge[],
  visibleNodes: BlueprintRFNode[]
): BlueprintRFEdge[] {
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
  return edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
}

export type CanvasExternalSummaryContext = {
  schema: SystemSchema;
  loadedSystems: readonly LoadedSystemInput[];
  allNodes: BlueprintRFNode[];
  allEdges: BlueprintRFEdge[];
  showUpstreamExternals: boolean;
  showDownstreamExternals: boolean;
  expandedExternalHub: ExternalSummaryBand | null;
  includeExternalsInFocus: boolean;
};

export type CanvasDisplayNodesInput = {
  filteredNodes: BlueprintRFNode[];
  filteredEdges: BlueprintRFEdge[];
  focusedCyclePath: string[] | null;
  couplingFocusMode: boolean;
  selectedNodeId: string | null;
  showSelectedDependenciesOnly: boolean;
  couplingGhostNodes: BlueprintRFNode[];
  workspaceFilepathIndex: WorkspaceFilepathIndex;
  showCoupling: boolean;
  couplingRefs: CouplingEdgeRef[];
  guidedRefactorEntityRefs: readonly string[] | null;
  showHotspotHeatmap: boolean;
  isResilienceMode: boolean;
  resilienceSafeguards: Partial<Record<EntityRef, NodeSafeguards>>;
  resilienceFaults: NodeFaultConfig[];
  resilienceSimulationResult: SimulationResult | null;
  resilienceSimulationScope: EntityRef[] | null;
  blastRipple: BlastRippleFrame;
  externalSummary?: CanvasExternalSummaryContext;
  hiddenExternalGhostNodes?: BlueprintRFNode[];
};

export function buildCanvasDisplayNodes({
  filteredNodes,
  filteredEdges,
  focusedCyclePath,
  couplingFocusMode,
  selectedNodeId,
  showSelectedDependenciesOnly,
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
  hiddenExternalGhostNodes = [],
}: CanvasDisplayNodesInput): BlueprintRFNode[] {
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
  const highlighted = applySimulationScopeHighlights(withBlast, {
    enabled: isResilienceMode && !!resilienceSimulationScope?.length,
    scope: resilienceSimulationScope,
  });

  const withDependencyHighlights = applyDependencyHighlights(
    highlighted,
    selectedNodeId,
    filteredEdges,
    showSelectedDependenciesOnly && !isResilienceMode && !focusedCyclePath
  );

  const withHiddenExternalGhosts =
    hiddenExternalGhostNodes.length > 0
      ? [...withDependencyHighlights, ...hiddenExternalGhostNodes]
      : withDependencyHighlights;

  if (!externalSummary) return withHiddenExternalGhosts;

  const summaryInput = {
    nodes: externalSummary.allNodes,
    edges: externalSummary.allEdges,
    schema: externalSummary.schema,
    loadedSystems: externalSummary.loadedSystems,
    selectedNodeId,
    showCallers: externalSummary.showUpstreamExternals,
    showTargets: externalSummary.showDownstreamExternals,
    expandedBand: externalSummary.expandedExternalHub,
    showCoupling,
    isResilienceMode,
    includeExternalsInFocus: externalSummary.includeExternalsInFocus,
  };
  const bands = resolveOverviewExternalBands(externalSummary.schema, externalSummary.loadedSystems);
  const hubNodes = buildExternalSummaryHubNodes(summaryInput, bands);
  return hubNodes.length > 0
    ? [...withHiddenExternalGhosts, ...hubNodes]
    : withHiddenExternalGhosts;
}

export type CanvasDisplayEdgesInput = {
  filteredEdges: BlueprintRFEdge[];
  filteredNodes: BlueprintRFNode[];
  displayNodes: BlueprintRFNode[];
  focusedCyclePath: string[] | null;
  couplingRefs: CouplingEdgeRef[];
  showCoupling: boolean;
  couplingGhostNodes: BlueprintRFNode[];
  selectedNodeId: string | null;
  schemaDependencies: SystemDependency[];
  couplingFocusMode: boolean;
  showCouplingSchemaDeps: boolean;
  selectedEdgeId: string | null;
  edges: BlueprintRFEdge[];
  showSelectedDependenciesOnly: boolean;
  liteCanvas: boolean;
  reduceMotion: boolean;
  isResilienceMode: boolean;
  propagationEdgeKeys: Set<string>;
  externalSummary?: CanvasExternalSummaryContext;
  hiddenExternalGhostEdges?: BlueprintRFEdge[];
};

export function buildCanvasDisplayEdges({
  filteredEdges,
  filteredNodes,
  displayNodes,
  focusedCyclePath,
  couplingRefs,
  showCoupling,
  couplingGhostNodes,
  selectedNodeId,
  schemaDependencies,
  couplingFocusMode,
  showCouplingSchemaDeps,
  selectedEdgeId,
  edges,
  showSelectedDependenciesOnly,
  liteCanvas,
  reduceMotion,
  isResilienceMode,
  propagationEdgeKeys,
  externalSummary,
  hiddenExternalGhostEdges = [],
}: CanvasDisplayEdgesInput): BlueprintRFEdge[] {
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
    schemaDependencies,
    couplingRefs,
    couplingFocusMode,
    showCouplingSchemaDeps
  );

  const visibleNodeIds = new Set(displayNodes.map(n => n.id));
  let next = filteredEdges.filter(
    e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  );

  if (hiddenExternalGhostEdges.length > 0) {
    const ghostIds = new Set(hiddenExternalGhostEdges.map(edge => edge.id));
    next = next.filter(edge => !ghostIds.has(edge.id));
    next = [...next, ...hiddenExternalGhostEdges];
  }

  if (externalSummary) {
    const summaryInput = {
      nodes: externalSummary.allNodes,
      edges: externalSummary.allEdges,
      schema: externalSummary.schema,
      loadedSystems: externalSummary.loadedSystems,
      selectedNodeId,
      showCallers: externalSummary.showUpstreamExternals,
      showTargets: externalSummary.showDownstreamExternals,
      expandedBand: externalSummary.expandedExternalHub,
      showCoupling,
      isResilienceMode,
      includeExternalsInFocus: externalSummary.includeExternalsInFocus,
    };
    const visibleExternalRefs = resolveVisibleExternalEntityRefs(summaryInput);
    const hiddenRefs = hiddenOverviewExternalRefs(externalSummary.allNodes, visibleExternalRefs);
    next = stripExternalIndividualEdges(next, externalSummary.allNodes, hiddenRefs);
  }

  if (selectedEdgeId && !next.some(e => e.id === selectedEdgeId)) {
    const selected = edges.find(e => e.id === selectedEdgeId);
    if (selected) next = [...next, selected];
  }

  const animationOpts = { liteCanvas, preferReducedMotion: reduceMotion };
  const dependencyFocusActive =
    showSelectedDependenciesOnly && !!selectedNodeId && !isResilienceMode && !focusedCyclePath;

  const styled = next.map(e => {
    const isSelected = e.id === selectedEdgeId;
    const isHiddenExternalGhost = e.data?.hiddenExternalGhost === true;
    const isPropagationRipple =
      isResilienceMode &&
      (propagationEdgeKeys.has(e.id) ||
        propagationEdgeKeys.has(blastPropagationEdgeKey(e.source, e.target)));
    const couplingDimmed =
      couplingFocusMode &&
      (couplingEdges.length > 0 || schemaDepEdges.length > 0) &&
      !e.data?.coupling &&
      !e.data?.schemaDependency;
    const isIncoming = dependencyFocusActive && e.target === selectedNodeId;
    const isOutgoing = dependencyFocusActive && e.source === selectedNodeId;
    const stroke = isPropagationRipple
      ? '#f87171'
      : isSelected
        ? '#00f0ff'
        : isHiddenExternalGhost
          ? '#22d3ee'
          : isIncoming
            ? '#a78bfa'
            : isOutgoing
              ? '#34d399'
              : ((e.style?.stroke as string | undefined) ?? DEPENDENCY_EDGE_STROKE);
    return {
      ...e,
      selected: isSelected,
      animated:
        !couplingDimmed &&
        (isPropagationRipple ||
          shouldAnimateDependencyEdge(
            e,
            selectedNodeId,
            showSelectedDependenciesOnly,
            animationOpts
          )),
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
        opacity: couplingDimmed ? 0.12 : isHiddenExternalGhost ? 0.9 : e.style?.opacity,
      },
    };
  });

  let result: BlueprintRFEdge[] = styled;
  if (showCoupling && couplingEdges.length > 0) {
    result = [...result, ...couplingEdges];
  }
  if (couplingFocusMode && schemaDepEdges.length > 0) {
    result = [...result, ...schemaDepEdges];
  }

  if (externalSummary) {
    const summaryInput = {
      nodes: externalSummary.allNodes,
      edges: externalSummary.allEdges,
      schema: externalSummary.schema,
      loadedSystems: externalSummary.loadedSystems,
      selectedNodeId,
      showCallers: externalSummary.showUpstreamExternals,
      showTargets: externalSummary.showDownstreamExternals,
      expandedBand: externalSummary.expandedExternalHub,
      showCoupling,
      isResilienceMode,
      includeExternalsInFocus: externalSummary.includeExternalsInFocus,
    };
    const bands = resolveOverviewExternalBands(
      externalSummary.schema,
      externalSummary.loadedSystems
    );
    const hubNodes = displayNodes.filter(node => node.data.externalSummaryHub);
    const hubEdges = buildExternalSummaryHubEdges(summaryInput, hubNodes, bands);
    if (hubEdges.length > 0) {
      result = [...result, ...hubEdges];
    }
  }

  return result;
}

export function getCanvasMiniMapNodeColor(
  node: RFNode,
  showHotspotHeatmap: boolean,
  isResilienceMode: boolean
): string {
  if (node.type !== 'blueprintNode') return '#1e293b';

  const hotspotHeat = typeof node.data?.hotspotHeat === 'number' ? node.data.hotspotHeat : 0;
  const blastHeat = typeof node.data?.blastHeat === 'number' ? node.data.blastHeat : 0;
  const integrityHeat = typeof node.data?.integrityHeat === 'number' ? node.data.integrityHeat : 0;

  if (showHotspotHeatmap && hotspotHeat > 0) {
    const heatColor = hotspotHeatmapMinimapColor(hotspotHeat);
    if (heatColor) return heatColor;
  }
  if (isResilienceMode) {
    if (blastHeat > 0) return blastHeatMinimapColor(blastHeat);
    if (integrityHeat > 0) return integrityHeatMinimapColor(integrityHeat);
  }
  if (node.data?.type === 'relational-database') return '#06b6d4';
  if (node.data?.type === 'event-broker') return '#a855f7';
  if (node.data?.type === 'grpc-service') return '#3b82f6';
  if (node.data?.type === 'serverless-function') return '#eab308';
  if (node.data?.type === 'rest-api') return '#10b981';
  if (node.data?.type === 'cache-store') return '#f97316';
  return '#1e293b';
}
