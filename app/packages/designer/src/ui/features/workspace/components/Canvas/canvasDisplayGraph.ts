import type { EntityRef, SystemDependency, WorkspaceFilepathIndex } from '@archlens/core';
import type { NodeSafeguards, SimulationResult, NodeFaultConfig } from '@archlens/core/resilience';
import {
  applyCouplingHighlights,
  applyRefactorBoundaryHighlights,
  buildCouplingOverlayEdges,
  buildCouplingSchemaDependencyEdges,
  filterCouplingFocusNodes,
} from '../../../../../application/forensics/buildCouplingOverlayEdges';
import { filterSelectedDependencyFocusNodes } from '../../../../../application/forensics/filterSelectedDependencyFocus';
import { shouldShowCanvasExternalNode } from '../../../../../application/forensics/externalNodeVisibility';
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
  showTests: boolean;
  showUpstreamExternals: boolean;
  showDownstreamExternals: boolean;
  selectedNodeId: string | null;
  showSelectedDependenciesOnly: boolean;
  isResilienceMode: boolean;
  simulationScopeSet: Set<string> | null;
};

export function buildCanvasVisibleNodes({
  nodes,
  edges,
  showTests,
  showUpstreamExternals,
  showDownstreamExternals,
  selectedNodeId,
  showSelectedDependenciesOnly,
  isResilienceMode,
  simulationScopeSet,
}: CanvasVisibleNodesInput): BlueprintRFNode[] {
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
}

export function buildCanvasVisibleEdges(
  edges: BlueprintRFEdge[],
  visibleNodes: BlueprintRFNode[]
): BlueprintRFEdge[] {
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
  return edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
}

export type CanvasDisplayNodesInput = {
  filteredNodes: BlueprintRFNode[];
  focusedCyclePath: string[] | null;
  couplingFocusMode: boolean;
  selectedNodeId: string | null;
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
};

export function buildCanvasDisplayNodes({
  filteredNodes,
  focusedCyclePath,
  couplingFocusMode,
  selectedNodeId,
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
  return applySimulationScopeHighlights(withBlast, {
    enabled: isResilienceMode && !!resilienceSimulationScope?.length,
    scope: resilienceSimulationScope,
  });
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

  const styled = next.map(e => {
    const isSelected = e.id === selectedEdgeId;
    const isPropagationRipple =
      isResilienceMode &&
      (propagationEdgeKeys.has(e.id) ||
        propagationEdgeKeys.has(blastPropagationEdgeKey(e.source, e.target)));
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
        shouldAnimateDependencyEdge(e, selectedNodeId, showSelectedDependenciesOnly, animationOpts),
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
