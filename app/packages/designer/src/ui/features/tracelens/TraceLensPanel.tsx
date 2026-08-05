import React, { useMemo } from 'react';
import { EstateRecommendationsPanel } from '../forensics/EstateRecommendationsPanel';
import { RefactorPlanSlideOver } from '../forensics/RefactorPlanSlideOver';
import { WorkspaceSourceCodeDialog } from '../workspace/components/SourceCodeDialog/WorkspaceSourceCodeDialog';
import { summarizeWorkspaceForensics } from '../../../application/forensics/summarizeWorkspaceForensics';
import { EstateRankedRow } from './EstateRankedRow';
import { TraceLensFilters } from './TraceLensFilters';
import { TraceLensHero } from './TraceLensHero';
import { TraceLensSegmented } from './TraceLensSegmented';
import { WorkspaceComplexitySummary } from './WorkspaceComplexitySummary';
import { useTraceLensActions } from './useTraceLensActions';
import { useTraceLensPanelModel } from './useTraceLensPanelModel';
import { TRACE_LENS_HERO } from '../../content/productOutcomes';

export const TraceLensPanel: React.FC = () => {
  const model = useTraceLensPanelModel();
  const actions = useTraceLensActions(model);

  const {
    loadedSystems,
    scopeEntityRef,
    scope,
    setScope,
    filter,
    setFilter,
    testFilter,
    setTestFilter,
    searchQuery,
    setSearchQuery,
    traceLensView,
    activePlan,
    clearActivePlan,
    hasScope,
    hasForensicsData,
    estateRanking,
    offenders,
    scopeOptions,
    lookback,
    resolveSourceProvenance,
    setEntityScope,
    setTraceLensView,
  } = model;

  const {
    openRecommendationFromEstate,
    openPlanOnCanvas,
    applyActivePlanAsDraft,
    simulateOffenderFailure,
    openEstateItem,
    handleRecommendationAction,
    simulateActivePlanFailure,
  } = actions;

  const complexitySummary = useMemo(
    () => summarizeWorkspaceForensics(loadedSystems, { scopeEntityRef }),
    [loadedSystems, scopeEntityRef]
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto blueprint-grid text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="bg-[#061125]/40 border border-[#00f0ff]/10 rounded-2xl p-5 md:p-7 backdrop-blur-sm">
          <TraceLensHero traceLensView={traceLensView} lookback={lookback} />

          <div className="mb-6">
            <TraceLensSegmented
              value={traceLensView}
              onChange={setTraceLensView}
              options={[
                { id: 'offenders', label: 'TraceLens' },
                { id: 'recommendations', label: 'AdviceLens' },
              ]}
            />
          </div>

          <WorkspaceComplexitySummary summary={complexitySummary} />

          {traceLensView === 'recommendations' ? (
            <EstateRecommendationsPanel
              items={estateRanking.items}
              summary={estateRanking.summary}
              report={estateRanking.report}
              systems={loadedSystems}
              scopeEntityRef={scopeEntityRef}
              onOpenRecommendation={openRecommendationFromEstate}
              onAction={action => void handleRecommendationAction(action)}
            />
          ) : (
            <>
              <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-slate-300 mb-4">
                {TRACE_LENS_HERO.offenders.sectionTitle}
              </h2>
              <TraceLensFilters
                scopeOptions={scopeOptions}
                scopeEntityRef={scopeEntityRef}
                onEntityScopeChange={setEntityScope}
                hasScope={hasScope}
                scope={scope}
                onScopeChange={setScope}
                filter={filter}
                onFilterChange={setFilter}
                testFilter={testFilter}
                onTestFilterChange={setTestFilter}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                offenderCount={offenders.length}
              />

              {offenders.length === 0 ? (
                <div className="rounded-xl border border-[#00f0ff]/10 bg-[#040914]/80 px-5 py-10 text-center">
                  <p className="text-sm text-slate-300">
                    {searchQuery.trim()
                      ? 'No offenders match this search.'
                      : 'No TraceLens signals in this view.'}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    {searchQuery.trim()
                      ? 'Try another name, entity ref, parent, or type.'
                      : scopeEntityRef
                        ? 'No offenders in this subtree for the current filter. Try another scope or widen the signal filter.'
                        : hasScope && !hasForensicsData
                          ? 'Blueprints are loaded but have no TraceLens blocks. Re-scan with git enabled (`archlens` default) or run `archlens enrich --git` on existing YAML.'
                          : hasScope
                            ? 'No rows match this filter. Try All or Heating, or zoom into more component diagrams from the canvas.'
                            : 'Open the Samples workspace or a blueprint folder from the startup chooser, then return to TraceLens.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2" data-testid="offender-list">
                  <div className="hidden md:grid grid-cols-[2.5rem_minmax(0,1.4fr)_minmax(0,1fr)_7rem_minmax(0,1fr)_5.5rem] gap-3 px-3 pb-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    <span>#</span>
                    <span>Recommendation</span>
                    <span>Diagram</span>
                    <span>Priority</span>
                    <span className="text-right">Signals</span>
                    <span className="text-right">Chaos</span>
                  </div>
                  {offenders.map((item, index) => (
                    <EstateRankedRow
                      key={`${item.recommendation.id}:${index}`}
                      item={item}
                      rank={index + 1}
                      onOpen={openEstateItem}
                      onSimulate={simulateOffenderFailure}
                      onAction={action => void handleRecommendationAction(action)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {activePlan?.boundary ? (
        <RefactorPlanSlideOver
          offender={activePlan.offender}
          boundary={activePlan.boundary}
          ownership={activePlan.ownership}
          suggestions={activePlan.suggestions}
          recommendations={activePlan.recommendations}
          coupledFiles={activePlan.coupledFiles}
          resolveSourceProvenance={resolveSourceProvenance}
          onClose={clearActivePlan}
          onOpenCanvas={openPlanOnCanvas}
          onApplyAsDraft={applyActivePlanAsDraft}
          canApplyAsDraft={(activePlan.boundary?.members.length ?? 0) >= 2}
          applyAsDraftHint={
            (activePlan.boundary?.members.length ?? 0) < 2
              ? 'Needs at least two coupled files in the boundary to create a draft refactor group.'
              : undefined
          }
          onSimulateFailure={simulateActivePlanFailure}
        />
      ) : null}
      <WorkspaceSourceCodeDialog />
    </div>
  );
};
