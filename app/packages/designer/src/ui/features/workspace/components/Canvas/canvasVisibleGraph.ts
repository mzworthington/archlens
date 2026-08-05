import type { LoadedSystemInput, SystemSchema } from '@archlens/core';
import type { ExternalSummaryBand } from '@archlens/core';
import {
  filterSelectedDependencyFocusNodes,
  collectDependencyNeighborhoodWithExternals,
} from '../../../../../application/forensics/filterSelectedDependencyFocus';
import { shouldShowCanvasExternalNode } from '../../../../../application/forensics/externalNodeVisibility';
import {
  isContextLevelDiagram,
  resolveVisibleExternalEntityRefs,
} from '../../../../../application/forensics/externalSummaryDisplay';
import type {
  BlueprintRFEdge,
  BlueprintRFNode,
} from '../../../../../application/store/layoutUtils';
import type { DependencyViewMode } from '../../../../../application/forensics/dependencyViewMode';
import {
  includeExternalsInFocusFromMode,
  isDependencyFocusMode,
} from '../../../../../application/forensics/dependencyViewMode';

export type CanvasVisibleNodesInput = {
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  schema: SystemSchema;
  loadedSystems: readonly LoadedSystemInput[];
  showTests: boolean;
  showUpstreamExternals: boolean;
  showDownstreamExternals: boolean;
  selectedNodeId: string | null;
  dependencyViewMode: DependencyViewMode;
  isResilienceMode: boolean;
  simulationScopeSet: Set<string> | null;
  showCoupling: boolean;
  expandedExternalHub: ExternalSummaryBand | null;
};

function isContextLevelAnchorNode(node: BlueprintRFNode): boolean {
  return node.data.type === 'person' || !!node.data.external;
}

/** Context diagrams always keep actors and external dependencies on canvas. */
function withContextLevelAnchors(
  level: SystemSchema['level'],
  visible: BlueprintRFNode[],
  candidates: BlueprintRFNode[]
): BlueprintRFNode[] {
  if (!isContextLevelDiagram(level)) return visible;
  const ids = new Set(visible.map(n => n.id));
  const anchors = candidates.filter(n => isContextLevelAnchorNode(n) && !ids.has(n.id));
  return anchors.length === 0 ? visible : [...visible, ...anchors];
}

export function buildCanvasVisibleNodes({
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
}: CanvasVisibleNodesInput): BlueprintRFNode[] {
  const focusActive =
    isDependencyFocusMode(dependencyViewMode) && !isResilienceMode && !!selectedNodeId;
  const includeExternalsInFocus = includeExternalsInFocusFromMode(dependencyViewMode);
  const contextLevel = isContextLevelDiagram(schema.level);

  if (focusActive && includeExternalsInFocus) {
    const candidates = nodes.filter(n => showTests || !n.data.isTest);
    const closure = collectDependencyNeighborhoodWithExternals(
      selectedNodeId,
      candidates,
      edges,
      true
    );
    const focused = candidates.filter(n => {
      if (closure.has(n.id)) return true;
      const entityRef = (n.data.entityRef ?? n.id) as string;
      return !!(
        simulationScopeSet &&
        (simulationScopeSet.has(entityRef) || simulationScopeSet.has(n.id))
      );
    });
    return withContextLevelAnchors(schema.level, focused, candidates);
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
    if (contextLevel && isContextLevelAnchorNode(n)) return true;
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
  const focused = filterSelectedDependencyFocusNodes(
    base,
    baseEdges,
    selectedNodeId,
    focusActive,
    false
  );
  return withContextLevelAnchors(schema.level, focused, base);
}

export function buildCanvasVisibleEdges(
  edges: BlueprintRFEdge[],
  visibleNodes: BlueprintRFNode[]
): BlueprintRFEdge[] {
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
  return edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
}
