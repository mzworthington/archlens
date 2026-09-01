import {
  applyCouplingHighlights,
  applyRefactorBoundaryHighlights,
  filterCouplingFocusNodes,
} from '../../../../../application/forensics/buildCouplingOverlayEdges';
import { applyDependencyHighlights } from '../../../../../application/forensics/applyDependencyHighlights';
import {
  buildExternalSummaryHubNodes,
  resolveOverviewExternalBands,
} from '../../../../../application/forensics/externalSummaryDisplay';
import { applyHotspotHeatmap } from '../../../../../application/forensics/hotspotHeatmap';
import { applyBlastHeatmap } from '../../../../../application/resilience/blastHeatmap';
import { applySafeguardHighlights } from '../../../../../application/resilience/safeguardHighlights';
import { applySimulationScopeHighlights } from '../../../../../application/resilience/simulationScopeHighlights';
import type { BlueprintRFNode } from '../../../../../application/store/layoutUtils';
import {
  includeExternalsInFocusFromMode,
  isDependencyFocusMode,
} from '../../../../../application/forensics/dependencyViewMode';
import type { CanvasDisplayNodesInput } from './canvasDisplayTypes';

export function buildCanvasDisplayNodes({
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
    isDependencyFocusMode(dependencyViewMode) && !isResilienceMode && !focusedCyclePath
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
    includeExternalsInFocus: includeExternalsInFocusFromMode(externalSummary.dependencyViewMode),
  };
  const bands = resolveOverviewExternalBands(externalSummary.schema, externalSummary.loadedSystems);
  const hubNodes = buildExternalSummaryHubNodes(summaryInput, bands);
  return hubNodes.length > 0
    ? [...withHiddenExternalGhosts, ...hubNodes]
    : withHiddenExternalGhosts;
}
