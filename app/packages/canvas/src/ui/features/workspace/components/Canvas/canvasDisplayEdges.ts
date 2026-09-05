import {
  buildCouplingOverlayEdges,
  buildCouplingSchemaDependencyEdges,
} from '../../../../../application/forensics/build/buildCouplingOverlayEdges';
import {
  buildExternalSummaryHubEdges,
  hiddenOverviewExternalRefs,
  resolveOverviewExternalBands,
  resolveVisibleExternalEntityRefs,
  stripExternalIndividualEdges,
} from '../../../../../application/forensics/externalSummaryDisplay';
import { blastPropagationEdgeKey } from '../../../../../application/resilience/blastRipple';
import {
  DEPENDENCY_EDGE_STROKE,
  dependencyArrowMarker,
  shouldAnimateDependencyEdge,
} from '../../../../../application/store/layoutUtils';
import type { BlueprintRFEdge } from '../../../../../application/store/layoutUtils';
import {
  includeExternalsInFocusFromMode,
  isDependencyFocusMode,
} from '../../../../../application/forensics/dependencyViewMode';
import type { CanvasDisplayEdgesInput } from './canvasDisplayTypes';

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
  dependencyViewMode,
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
      includeExternalsInFocus: includeExternalsInFocusFromMode(externalSummary.dependencyViewMode),
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
    isDependencyFocusMode(dependencyViewMode) &&
    !!selectedNodeId &&
    !isResilienceMode &&
    !focusedCyclePath;

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
          shouldAnimateDependencyEdge(e, selectedNodeId, dependencyFocusActive, animationOpts)),
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
      includeExternalsInFocus: includeExternalsInFocusFromMode(externalSummary.dependencyViewMode),
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
