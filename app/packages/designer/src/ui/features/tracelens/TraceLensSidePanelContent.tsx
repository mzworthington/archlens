import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useLocation } from 'wouter';
import { WorkspaceDisplayControls } from '../workspace/components/PropertyPanel/WorkspaceDisplayControls';
import { ForensicsSection } from '../workspace/components/PropertyPanel/ForensicsSection';
import { DependencyViewControl } from '../workspace/components/PropertyPanel/DependencyViewControl';
import { DependencyMiniGraph } from '../workspace/components/PropertyPanel/DependencyMiniGraph';
import { useTraceLensSidePanelModel } from './useTraceLensSidePanelModel';
import { useBlueprintStore } from '../../../application/store/store';
import { buildTraceLensUrl } from '../forensics/traceLensUrl';
import { workspaceEntityRefFromPath } from '../../../application/navigation/workspaceUrl';

export const TraceLensSidePanelContent: React.FC = () => {
  const [location, setLocation] = useLocation();
  const setTraceLensMode = useBlueprintStore(s => s.setTraceLensMode);
  const model = useTraceLensSidePanelModel();
  const {
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
    blastRadius,
    displayCounts,
    showTests,
    toggleShowTests,
    showUpstreamExternals,
    toggleShowUpstreamExternals,
    showDownstreamExternals,
    toggleShowDownstreamExternals,
    showSelectedDependenciesOnly,
    toggleShowSelectedDependenciesOnly,
    showHotspotHeatmap,
    toggleShowHotspotHeatmap,
    toggleShowCoupling,
    selectNode,
  } = model;

  const worstOffendersScope =
    selectedNode?.entityRef ?? scopeEntityRef ?? workspaceEntityRefFromPath(location);

  const openWorstOffenders = () => {
    setTraceLensMode(true);
    setLocation(buildTraceLensUrl(worstOffendersScope));
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="space-y-2">
        <button
          type="button"
          onClick={openWorstOffenders}
          data-testid="tracelens-worst-offenders-cta"
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-cyan-100 border border-cyan-500/40 hover:border-cyan-400/60 bg-cyan-950/30 hover:bg-cyan-950/50 rounded-lg transition cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
          View worst offenders
        </button>
        <p className="text-[10px] leading-snug text-slate-500 text-center">
          Estate-wide ranked forensics signals and AdviceLens recommendations.
        </p>
      </div>

      <WorkspaceDisplayControls
        showTests={showTests}
        onToggleShowTests={toggleShowTests}
        showUpstreamExternals={showUpstreamExternals}
        onToggleShowUpstreamExternals={toggleShowUpstreamExternals}
        showDownstreamExternals={showDownstreamExternals}
        onToggleShowDownstreamExternals={toggleShowDownstreamExternals}
        showSelectedDependenciesOnly={showSelectedDependenciesOnly}
        onToggleShowSelectedDependenciesOnly={toggleShowSelectedDependenciesOnly}
        showHotspotHeatmap={showHotspotHeatmap}
        onToggleShowHotspotHeatmap={toggleShowHotspotHeatmap}
        showCoupling={showCoupling}
        onToggleShowCoupling={toggleShowCoupling}
        showCouplingSchemaDeps={showCouplingSchemaDeps}
        onToggleShowCouplingSchemaDeps={toggleShowCouplingSchemaDeps}
        counts={displayCounts}
        countsScopedToNode={!!selectedNode?.entityRef}
        dependencyFocusActive={!!selectedNodeId && dependencyViewMode !== 'full'}
        className="border-t border-slate-900 pt-4 space-y-3"
      />

      {selectedNode?.forensics ? (
        <ForensicsSection
          entityRef={selectedNode.entityRef}
          forensics={selectedNode.forensics}
          trendDashboard={forensicsTrendDashboard}
          centerLabel={selectedNode.name}
          blastRadius={blastRadius}
          linkedCouplingPaths={linkedCouplingPaths}
          linkedImportPaths={linkedImportPaths}
          showCoupling={showCoupling}
          hasSelectedNode={!!selectedNodeId}
          onToggleShowCouplingSchemaDeps={toggleShowCouplingSchemaDeps}
          showCouplingSchemaDeps={showCouplingSchemaDeps}
          linkedCouplingCount={linkedCouplingCount}
          focusCouplingCount={focusCouplingCount}
          onSelectCoupledPeer={handleSelectCoupledPeer}
          onSelectImportPeer={handleSelectCoupledPeer}
          hideOpenLink
          hideSchemaDepsToggle
        />
      ) : (
        <div className="border-t border-slate-900 pt-4" data-testid="tracelens-empty-selection">
          <p className="text-xs text-slate-400 leading-relaxed">
            Select a node on the canvas to see forensics metrics, coupling peers, and dependency
            graph details.
          </p>
        </div>
      )}

      {selectedNode ? (
        <>
          <DependencyViewControl
            mode={dependencyViewMode}
            onChange={setDependencyViewMode}
            disabled={isResilienceMode}
          />

          {(dependencyGraphModel.upstreamTotal > 0 || dependencyGraphModel.downstreamTotal > 0) && (
            <div className="border-t border-slate-900 pt-4 space-y-2">
              <h4 className="text-[10px] font-bold font-mono text-brand-400 uppercase tracking-wider">
                Dependency graph
              </h4>
              <DependencyMiniGraph
                centerLabel={selectedNode.name}
                upstream={dependencyGraphModel.upstream}
                downstream={dependencyGraphModel.downstream}
                upstreamTotal={dependencyGraphModel.upstreamTotal}
                downstreamTotal={dependencyGraphModel.downstreamTotal}
                onPeerClick={selectNode}
              />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};
