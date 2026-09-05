import { useMemo } from 'react';
import { useBlueprintStore } from '../../../application/store/store';
import { resolveImportPeerPaths } from '../../../application/forensics/resolveCouplingEdges';
import {
  useCouplingLens,
  useSelectCoupledPeer,
} from '../../../application/forensics/useCouplingLens';
import {
  buildForensicsTrendDashboard,
  collectDescendantForensics,
} from '../../../application/forensics/build/buildForensicsTrendDashboard';
import { buildDependencyGraphModel } from '../../../application/forensics/filterSelectedDependencyFocus';
import { countSchemaForensicsMetrics } from '../../../application/forensics/countForensicsMetrics';
import { isDependencyFocusMode } from '../../../application/forensics/dependencyViewMode';
import { useActiveDiagramEntity } from '../workspace/hooks/useActiveDiagramEntity';

export function useTraceLensSidePanelModel() {
  const {
    schema,
    selectedNodeId,
    nodes,
    edges,
    loadedSystems,
    showCoupling,
    showCouplingSchemaDeps,
    toggleShowCouplingSchemaDeps,
    selectNode,
    isResilienceMode,
    resilienceSimulationResult,
    dependencyViewMode,
    setDependencyViewMode,
    showTests,
    toggleShowTests,
    showUpstreamExternals,
    toggleShowUpstreamExternals,
    showDownstreamExternals,
    toggleShowDownstreamExternals,
    toggleShowSelectedDependenciesOnly,
    showHotspotHeatmap,
    toggleShowHotspotHeatmap,
    toggleShowCoupling,
    leftCollapsed,
    toggleLeftCollapsed,
  } = useBlueprintStore();

  const { parentEntityRef } = useActiveDiagramEntity();
  const scopeEntityRef = parentEntityRef ?? schema.entityRef ?? undefined;

  const selectedRFNode = nodes.find(
    n => n.id === selectedNodeId || n.data.entityRef === selectedNodeId
  );
  const selectedNode = selectedRFNode
    ? schema.nodes.find(
        sn =>
          sn.entityRef === selectedRFNode.data.entityRef ||
          sn.entityRef?.endsWith('/' + selectedRFNode.id)
      )
    : null;

  const { workspaceFilepathIndex, linkedCouplingPaths, linkedCouplingCount, focusCouplingCount } =
    useCouplingLens({
      showCoupling,
      selectedNodeId,
      nodes,
      loadedSystems,
    });

  const handleSelectCoupledPeer = useSelectCoupledPeer(nodes, workspaceFilepathIndex, selectNode);

  const dependencyGraphModel = useMemo(() => {
    if (!selectedNodeId) {
      return { upstream: [], downstream: [], upstreamTotal: 0, downstreamTotal: 0 };
    }
    return buildDependencyGraphModel(selectedNodeId, nodes, edges);
  }, [selectedNodeId, nodes, edges]);

  const forensicsTrendDashboard = useMemo(() => {
    if (!selectedNode?.forensics) return undefined;
    const descendants = collectDescendantForensics(
      loadedSystems,
      selectedNode.entityRef,
      schema.level
    );
    return buildForensicsTrendDashboard(selectedNode.forensics, descendants, schema.level);
  }, [loadedSystems, selectedNode, schema.level]);

  const displayCounts = useMemo(() => {
    return countSchemaForensicsMetrics(schema, selectedNode?.entityRef ?? null);
  }, [schema, selectedNode?.entityRef]);

  const linkedImportPaths = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    return new Set(
      resolveImportPeerPaths(selectedNodeId, nodes, workspaceFilepathIndex).map(edge => edge.path)
    );
  }, [selectedNodeId, nodes, workspaceFilepathIndex]);

  return {
    schema,
    scopeEntityRef,
    selectedNodeId,
    selectedNode,
    showCoupling,
    showCouplingSchemaDeps,
    toggleShowCouplingSchemaDeps,
    linkedCouplingPaths,
    linkedCouplingCount,
    focusCouplingCount,
    handleSelectCoupledPeer,
    linkedImportPaths,
    forensicsTrendDashboard,
    dependencyGraphModel,
    dependencyViewMode,
    setDependencyViewMode,
    isResilienceMode,
    blastRadius:
      selectedNode?.entityRef && resilienceSimulationResult
        ? resilienceSimulationResult.heat.get(selectedNode.entityRef)
        : undefined,
    displayCounts,
    showTests,
    toggleShowTests,
    contextLevelAlwaysShowExternals: schema.level === 'context',
    showUpstreamExternals,
    toggleShowUpstreamExternals,
    showDownstreamExternals,
    toggleShowDownstreamExternals,
    showSelectedDependenciesOnly: isDependencyFocusMode(dependencyViewMode),
    toggleShowSelectedDependenciesOnly,
    showHotspotHeatmap,
    toggleShowHotspotHeatmap,
    toggleShowCoupling,
    leftCollapsed,
    toggleLeftCollapsed,
    selectNode,
  };
}
