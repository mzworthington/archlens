import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useShallow } from 'zustand/react/shallow';
import { AppHeader } from '../../components/AppHeader';
import { useBlueprintStore } from '../../../application/store/store';
import type {
  EstateRecommendation,
  RankedEstateItem,
} from '../../../application/recommendations/buildEstateRecommendations';
import {
  filterRankedEstateItems,
  rankEstateItems,
} from '../../../application/recommendations/buildEstateRecommendations';
import { executeRecommendationAction } from '../../../application/recommendations/executeRecommendationAction';
import {
  findForensicsOffenderByEntityRef,
  rankForensicsOffenders,
  resolveLookbackDays,
  loadedSystemsHaveForensics,
  offenderMatchesEntityScope,
  type OffenderScope,
  type OffenderSignalFilter,
  type OffenderTestFilter,
  type RankedOffender,
} from '../../../application/forensics/rankOffenders';
import { buildRefactorPlanForOffender } from '../../../application/forensics/buildRefactorPlan';
import { buildChaosRiskContextMap } from '../../../application/forensics/chaosRiskContext';
import { openRefactorOnCanvas } from '../../../application/forensics/openRefactorOnCanvas';
import { applyRefactorPlanAsDraft } from '../../../application/forensics/applyRefactorPlanAsDraft';
import { openSimulateFailureOnCanvas } from '../../../application/forensics/openSimulateFailureOnCanvas';
import type { ConcernLevel } from '../../../application/forensics/concern';
import { ChurnSparkline } from '../../components/ChurnSparkline/ChurnSparkline';
import { ForensicsSearchbar } from './ForensicsSearchbar';
import { TraceLensScopePicker } from './TraceLensScopePicker';
import { RefactorPlanSlideOver } from './RefactorPlanSlideOver';
import { EstateRecommendationsPanel } from './EstateRecommendationsPanel';
import { ForensicsWorkspacePanel } from './ForensicsWorkspacePanel';
import { WorkspaceSourceCodeDialog } from '../workspace/components/SourceCodeDialog/WorkspaceSourceCodeDialog';
import { useTraceLensUrlSync } from './useTraceLensUrlSync';
import { useTraceLensScopeLoad } from './useTraceLensScopeLoad';
import { useDeferredLoadedSystems } from './useDeferredLoadedSystems';
import { useTraceLensScopeFromUrl } from './useTraceLensScopeFromUrl';
import { parseTraceLensUrl, buildTraceLensUrl } from './traceLensUrl';
import { buildTraceLensScopeOptions } from '../../../application/forensics/buildTraceLensScopeOptions';
import { loadWorkspaceSession } from '../../../application/store/workspaceSession';
import {
  DIAGRAM_LAYOUT_MESSAGE,
  DIAGRAM_LOADING_MESSAGE,
  FORENSICS_PREFETCH_MESSAGE,
  SANDBOX_LOADING_MESSAGE,
} from '../../../application/store/diagramLoadSession';

function isForensicsLoadingState(isLoading: boolean | string): boolean {
  if (!isLoading) return false;
  if (isLoading === true) return true;
  return isLoading === SANDBOX_LOADING_MESSAGE || isLoading === FORENSICS_PREFETCH_MESSAGE;
}

function scoreBarColor(level: ConcernLevel): string {
  switch (level) {
    case 'danger':
      return 'bg-red-400';
    case 'warning':
      return 'bg-amber-400';
    case 'info':
      return 'bg-slate-400';
    default:
      return 'bg-[#00f0ff]/70';
  }
}

function rowBorder(level: ConcernLevel): string {
  switch (level) {
    case 'danger':
      return 'border-red-900/40 hover:border-red-700/50';
    case 'warning':
      return 'border-amber-900/40 hover:border-amber-700/50';
    default:
      return 'border-[#00f0ff]/10 hover:border-[#00f0ff]/25';
  }
}

type TraceLensView = 'offenders' | 'recommendations';

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-[#00f0ff]/15 bg-[#040914]/80 p-0.5">
      {options.map(opt => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
              active
                ? 'bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/30'
                : 'text-slate-400 hover:text-slate-100 border border-transparent'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function EstateRankedRow({
  item,
  rank,
  onOpen,
  onSimulate,
  onAction,
}: {
  item: RankedEstateItem;
  rank: number;
  onOpen: (item: RankedEstateItem) => void;
  onSimulate: (offender: RankedOffender) => void;
  onAction: (action: EstateRecommendation['actions'][number], item: RankedEstateItem) => void;
}) {
  const { recommendation, offender } = item;
  const displayScore = recommendation.priority;
  const scoreLabel = 'priority';
  const scorePct = Math.max(0, Math.min(100, displayScore));
  const concernLevel: ConcernLevel =
    displayScore >= 85 ? 'danger' : displayScore >= 65 ? 'warning' : 'info';
  const hasChaosContext = Boolean(
    offender?.chaosRiskLabel || offender?.onResilienceCriticalPath || offender?.isResilienceSpof
  );
  const signals = [
    recommendation.source === 'chaoslens' || hasChaosContext ? 'CHAOS' : 'TRACE',
    recommendation.kind.startsWith('refactor-') ? 'REFACTOR' : null,
    offender?.classifications.includes('hotspot') ? 'HOT' : null,
    offender?.classifications.includes('knowledge-silo') ? 'SILO' : null,
    offender?.isResilienceSpof ? 'SPOF' : null,
    offender?.onResilienceCriticalPath ? 'BLAST' : null,
    item.isFallback ? 'FORENSICS' : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className={`w-full grid grid-cols-[2.5rem_minmax(0,1.4fr)_minmax(0,1fr)_7rem_minmax(0,1fr)_5.5rem] gap-3 items-center rounded-xl border bg-[#040914]/60 px-3 py-3 transition-colors ${rowBorder(concernLevel)}`}
      data-testid={`estate-row-${recommendation.id}`}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="contents text-left"
        aria-label={`Open refactor plan for ${recommendation.targetName}`}
      >
        <span className="font-mono text-xs text-slate-500 tabular-nums">#{rank}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{recommendation.title}</p>
          <p className="truncate font-mono text-[10px] text-slate-500">
            {recommendation.targetName} · {recommendation.kind}
          </p>
          {offender?.chaosRiskLabel ? (
            <p
              className="truncate text-[10px] text-red-300/90 mt-0.5"
              data-testid={`chaos-risk-label-${offender.entityRef}`}
            >
              {offender.chaosRiskLabel}
            </p>
          ) : null}
        </div>
        <p className="min-w-0 truncate text-xs text-slate-400">{recommendation.diagramName}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] text-slate-500">{scoreLabel}</span>
            <span className="font-mono text-[10px] text-slate-300">{displayScore}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
            <div
              className={`h-full rounded-full ${scoreBarColor(concernLevel)}`}
              style={{ width: `${scorePct}%` }}
            />
          </div>
          {offender?.churnByWeek && offender.churnByWeek.length > 0 ? (
            <div className="flex justify-end text-[#00f0ff]/70">
              <ChurnSparkline data={offender.churnByWeek} width={72} height={20} />
            </div>
          ) : null}
        </div>
        <div className="min-w-0 flex flex-wrap items-center gap-1.5 justify-end">
          {signals.map(signal => (
            <span
              key={signal}
              className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider border ${
                signal === 'HOT'
                  ? 'bg-red-950/50 text-red-300 border-red-900/50'
                  : signal === 'REFACTOR'
                    ? 'bg-violet-950/50 text-violet-300 border-violet-900/50'
                    : signal === 'CHAOS' || signal === 'BLAST' || signal === 'SPOF'
                      ? 'bg-red-950/50 text-red-300 border-red-900/50'
                      : 'bg-amber-950/50 text-amber-300 border-amber-900/50'
              }`}
            >
              {signal}
            </span>
          ))}
          <span className="font-mono text-[10px] text-slate-500 truncate">
            {[
              offender && offender.dependencyCount > 0 ? `deps ${offender.dependencyCount}` : null,
              recommendation.evidence.compositeRiskScore != null
                ? `risk ${recommendation.evidence.compositeRiskScore.toFixed(2)}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
      </button>
      {offender ? (
        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            onSimulate(offender);
          }}
          className="justify-self-end rounded-lg border border-red-500/35 bg-red-950/20 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-red-200 hover:bg-red-950/40 transition-colors"
          data-testid={`simulate-failure-${offender.entityRef}`}
          title="Simulate region outage in ChaosLens"
        >
          Simulate
        </button>
      ) : (
        <span className="justify-self-end" />
      )}
      {recommendation.actions.length > 0 ? (
        <div className="col-span-full flex flex-wrap gap-2 pt-1">
          {recommendation.actions.slice(0, 2).map(action => (
            <button
              key={`${recommendation.id}:${action.kind}`}
              type="button"
              onClick={event => {
                event.stopPropagation();
                onAction(action, item);
              }}
              className="rounded-md border border-[#00f0ff]/20 bg-[#061125]/80 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#00f0ff] hover:border-[#00f0ff]/40"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const ForensicsPage: React.FC = () => {
  const {
    loadedSystems,
    workspaceCatalog,
    isWorkspaceOpen,
    workspaceName,
    isLoading,
    diagramLoadCount,
    loadBundledSandbox,
    restoreWorkspaceSession,
    openWorkspaceDirectory,
    prefetchAllWorkspaceSystems,
    selectSystem,
    simulateResilienceFaultAtNode,
    selectNode,
    setShowCoupling,
    setGuidedRefactorEntityRefs,
    applyRefactorBoundaryAsDraft,
    setIsDiffOpen,
    setNotification,
    isSourceCodeOpen,
    sourceCodeFilepath,
    openSourceCodeDialog,
    closeSourceCodeDialog,
    resilienceSimulationResult,
    resilienceSafeguards,
    setResilienceSafeguard,
    setResilienceMode,
    setResiliencePanelTab,
  } = useBlueprintStore(
    useShallow(state => ({
      loadedSystems: state.loadedSystems,
      workspaceCatalog: state.workspaceCatalog,
      isWorkspaceOpen: state.isWorkspaceOpen,
      workspaceName: state.workspaceName,
      isLoading: state.isLoading,
      diagramLoadCount: state.diagramLoadCount,
      loadBundledSandbox: state.loadBundledSandbox,
      restoreWorkspaceSession: state.restoreWorkspaceSession,
      openWorkspaceDirectory: state.openWorkspaceDirectory,
      prefetchAllWorkspaceSystems: state.prefetchAllWorkspaceSystems,
      selectSystem: state.selectSystem,
      simulateResilienceFaultAtNode: state.simulateResilienceFaultAtNode,
      selectNode: state.selectNode,
      setShowCoupling: state.setShowCoupling,
      setGuidedRefactorEntityRefs: state.setGuidedRefactorEntityRefs,
      applyRefactorBoundaryAsDraft: state.applyRefactorBoundaryAsDraft,
      setIsDiffOpen: state.setIsDiffOpen,
      setNotification: state.setNotification,
      isSourceCodeOpen: state.isSourceCodeOpen,
      sourceCodeFilepath: state.sourceCodeFilepath,
      openSourceCodeDialog: state.openSourceCodeDialog,
      closeSourceCodeDialog: state.closeSourceCodeDialog,
      resilienceSimulationResult: state.resilienceSimulationResult,
      resilienceSafeguards: state.resilienceSafeguards,
      setResilienceSafeguard: state.setResilienceSafeguard,
      setResilienceMode: state.setResilienceMode,
      setResiliencePanelTab: state.setResiliencePanelTab,
    }))
  );
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const urlState = parseTraceLensUrl(location, search);
  const scopeEntityRef = urlState.entityRef ?? null;
  const [scope, setScope] = useState<OffenderScope>('components');
  const [filter, setFilter] = useState<OffenderSignalFilter>('all');
  const [testFilter, setTestFilter] = useState<OffenderTestFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rankLoadedOnly, setRankLoadedOnly] = useState(false);
  const traceLensView: TraceLensView =
    urlState.view === 'recommendations' ? 'recommendations' : 'offenders';
  const [activePlan, setActivePlan] = useState<
    | (ReturnType<typeof buildRefactorPlanForOffender> & {
        offender: RankedOffender;
      })
    | null
  >(null);

  const clearActivePlan = useCallback(() => {
    setActivePlan(null);
    closeSourceCodeDialog();
  }, [closeSourceCodeDialog]);
  const setActivePlanFromUrl = useCallback(
    (plan: NonNullable<typeof activePlan>) => setActivePlan(plan),
    []
  );

  const forensicsBusy =
    diagramLoadCount > 0 ? isForensicsLoadingState(isLoading) : isLoading === true;

  useEffect(() => {
    const { diagramLoadCount: loadCount, isLoading: loading } = useBlueprintStore.getState();
    if (loadCount > 0 || !loading) return;
    if (
      loading === DIAGRAM_LOADING_MESSAGE ||
      loading === DIAGRAM_LAYOUT_MESSAGE ||
      loading === SANDBOX_LOADING_MESSAGE
    ) {
      useBlueprintStore.setState({ isLoading: false });
    }
  }, []);

  const loadedCount = loadedSystems.length;
  const catalogCount = workspaceCatalog.length > 0 ? workspaceCatalog.length : loadedCount;
  const unloadedCount = useMemo(
    () =>
      workspaceCatalog.filter(entry => !loadedSystems.some(system => system.path === entry.path))
        .length,
    [workspaceCatalog, loadedSystems]
  );
  const hasScope = loadedCount > 0 || isWorkspaceOpen;
  const pendingFolderSession = useMemo(() => {
    if (hasScope || forensicsBusy) return false;
    return loadWorkspaceSession()?.mode === 'folder';
  }, [hasScope, forensicsBusy]);
  const pendingFolderName = useMemo(() => {
    if (!pendingFolderSession) return undefined;
    return loadWorkspaceSession()?.workspaceName;
  }, [pendingFolderSession]);
  const hasForensicsData = loadedSystemsHaveForensics(loadedSystems);
  const workspaceLabel = isWorkspaceOpen ? workspaceName || 'Folder workspace' : 'Bundled sandbox';
  const deferRankingWhilePrefetch = unloadedCount > 0 && !rankLoadedOnly;
  const rankingSystems = useDeferredLoadedSystems(loadedSystems, deferRankingWhilePrefetch);

  const chaosContext = useMemo(
    () =>
      resilienceSimulationResult
        ? buildChaosRiskContextMap(loadedSystems, resilienceSimulationResult, resilienceSafeguards)
        : undefined,
    [loadedSystems, resilienceSimulationResult, resilienceSafeguards]
  );

  const estateRanking = useMemo(() => {
    const ranking = rankEstateItems(rankingSystems);
    if (!chaosContext) return ranking;

    return {
      ...ranking,
      items: ranking.items.map(item => {
        if (!item.offender) return item;
        const offender = findForensicsOffenderByEntityRef(
          [...rankingSystems],
          item.offender.entityRef,
          chaosContext
        );
        return offender ? { ...item, offender } : item;
      }),
    };
  }, [rankingSystems, chaosContext]);

  const ranked = useMemo(
    () => rankForensicsOffenders(rankingSystems, 'components', 'all', chaosContext, testFilter),
    [rankingSystems, chaosContext, testFilter]
  );

  const estateItems = useMemo(
    () =>
      filterRankedEstateItems(estateRanking.items, {
        scope,
        scopeEntityRef,
        systems: rankingSystems,
        filter,
        testFilter,
        query: searchQuery,
      }),
    [estateRanking.items, scope, scopeEntityRef, rankingSystems, filter, testFilter, searchQuery]
  );

  const scopeOptions = useMemo(
    () => buildTraceLensScopeOptions(rankingSystems, workspaceCatalog, ranked),
    [rankingSystems, workspaceCatalog, ranked]
  );

  useTraceLensScopeFromUrl({
    scopeEntityRef,
    workspaceCatalog,
    loadedSystems,
    setScope,
  });

  useEffect(() => {
    if (!hasScope) {
      void restoreWorkspaceSession();
    }
  }, [hasScope, restoreWorkspaceSession]);

  useTraceLensScopeLoad({
    scopeEntityRef,
    hasScope,
    isWorkspaceOpen,
    workspaceCatalog,
    loadedSystems,
  });

  useEffect(() => {
    if (!hasScope || unloadedCount === 0 || rankLoadedOnly) return;
    void prefetchAllWorkspaceSystems();
  }, [hasScope, unloadedCount, prefetchAllWorkspaceSystems, rankLoadedOnly]);

  const handleLoadSandbox = useCallback(async () => {
    await loadBundledSandbox();
  }, [loadBundledSandbox]);

  const handleOpenDirectory = useCallback(async () => {
    const opened = await openWorkspaceDirectory();
    if (opened) {
      await prefetchAllWorkspaceSystems();
    }
  }, [openWorkspaceDirectory, prefetchAllWorkspaceSystems]);

  const scopedOffenders = useMemo(() => {
    if (!scopeEntityRef) return ranked;
    return ranked.filter(o => offenderMatchesEntityScope(o, scopeEntityRef, loadedSystems));
  }, [ranked, scopeEntityRef, loadedSystems]);

  const offenders = estateItems;

  const legacyPlanEntityRef = useMemo(() => {
    if (urlState.planEntityRef || !scopeEntityRef) return null;
    if (scopedOffenders.length !== 1 || scopedOffenders[0].entityRef !== scopeEntityRef)
      return null;
    return scopeEntityRef;
  }, [urlState.planEntityRef, scopeEntityRef, scopedOffenders]);

  const refactorPlanOptions = useMemo(
    () => ({
      simulation: resilienceSimulationResult,
      sessionSafeguards: resilienceSafeguards,
    }),
    [resilienceSimulationResult, resilienceSafeguards]
  );

  useTraceLensUrlSync({
    loadedSystems,
    scopeEntityRef,
    legacyPlanEntityRef,
    activePlanEntityRef: activePlan?.offender.entityRef ?? null,
    setActivePlan: setActivePlanFromUrl,
    clearActivePlan,
    isSourceCodeOpen,
    sourceCodeFilepath,
    openSourceCodeDialog,
    closeSourceCodeDialog,
    refactorPlanOptions,
  });

  const lookback = useMemo(() => resolveLookbackDays(ranked), [ranked]);

  const resolveSourceProvenance = useCallback(
    (entityRef: string) => {
      for (const system of loadedSystems) {
        if (system.schema.nodes.some(node => node.entityRef === entityRef)) {
          return system.schema.source;
        }
      }
      return undefined;
    },
    [loadedSystems]
  );

  const setEntityScope = useCallback(
    (entityRef: string | null) => {
      clearActivePlan();
      setLocation(
        buildTraceLensUrl(entityRef, {
          view: traceLensView === 'recommendations' ? 'recommendations' : null,
        })
      );
    },
    [clearActivePlan, setLocation, traceLensView]
  );

  const setTraceLensView = useCallback(
    (view: TraceLensView) => {
      setLocation(
        buildTraceLensUrl(scopeEntityRef, {
          planEntityRef: urlState.planEntityRef,
          showSource: urlState.showSource,
          view: view === 'recommendations' ? 'recommendations' : null,
        }),
        { replace: true }
      );
    },
    [scopeEntityRef, setLocation, urlState.planEntityRef, urlState.showSource]
  );

  const openOffender = useCallback(
    (offender: RankedOffender) => {
      const plan = buildRefactorPlanForOffender(offender, loadedSystems, refactorPlanOptions);
      if (!plan.boundary) return;
      setActivePlan({ offender, ...plan });
      const planScope = scopeEntityRef ?? offender.entityRef;
      setLocation(
        buildTraceLensUrl(planScope, {
          planEntityRef: offender.entityRef,
          view: traceLensView === 'recommendations' ? 'recommendations' : null,
        }),
        {
          replace: true,
        }
      );
    },
    [loadedSystems, refactorPlanOptions, scopeEntityRef, setLocation, traceLensView]
  );

  const openRecommendationFromEstate = useCallback(
    (recommendation: EstateRecommendation) => {
      const offender = findForensicsOffenderByEntityRef(
        loadedSystems,
        recommendation.targetEntityRef
      );
      if (!offender) return;
      openOffender(offender);
    },
    [loadedSystems, openOffender]
  );

  const openPlanOnCanvas = () => {
    if (!activePlan?.boundary) return;
    openRefactorOnCanvas(activePlan.boundary, activePlan.offender, {
      selectSystem,
      selectNode,
      setShowCoupling,
      setGuidedRefactorEntityRefs,
      setLocation,
    });
    setActivePlan(null);
  };

  const applyActivePlanAsDraft = () => {
    if (!activePlan?.boundary) return;
    void applyRefactorPlanAsDraft(activePlan.boundary, activePlan.offender, {
      selectSystem,
      applyRefactorBoundaryAsDraft,
      setLocation,
      setGuidedRefactorEntityRefs,
      setIsDiffOpen,
    }).then(result => {
      if (!result.ok) {
        setNotification({
          type: 'warning',
          title: 'Could not apply draft',
          message: result.reason,
        });
        return;
      }
      setNotification({
        type: 'success',
        title: 'Draft boundary added',
        message: 'A refactor group was added to the working copy. Review it in Pending Changes.',
      });
      setActivePlan(null);
    });
  };

  const simulateOffenderFailure = useCallback(
    (offender: RankedOffender) => {
      void openSimulateFailureOnCanvas(offender, {
        selectSystem,
        setLocation,
        simulateResilienceFaultAtNode,
      });
    },
    [selectSystem, setLocation, simulateResilienceFaultAtNode]
  );

  const openEstateItem = useCallback(
    (item: RankedEstateItem) => {
      if (item.offender) {
        openOffender(item.offender);
        return;
      }
      openRecommendationFromEstate(item.recommendation);
    },
    [openOffender, openRecommendationFromEstate]
  );

  const recommendationActionContext = useMemo(
    () => ({
      loadedSystems,
      selectSystem,
      setLocation,
      simulateResilienceFaultAtNode,
      setResilienceSafeguard,
      setResilienceMode,
      setResiliencePanelTab,
      openRefactorPlan: openOffender,
    }),
    [
      loadedSystems,
      selectSystem,
      setLocation,
      simulateResilienceFaultAtNode,
      setResilienceSafeguard,
      setResilienceMode,
      setResiliencePanelTab,
      openOffender,
    ]
  );

  const handleRecommendationAction = useCallback(
    async (action: EstateRecommendation['actions'][number]) => {
      const result = await executeRecommendationAction(action, recommendationActionContext);
      if (!result.ok) {
        setNotification({
          type: 'warning',
          title: 'Action unavailable',
          message: result.reason ?? 'Could not run this recommendation action.',
        });
      }
    },
    [recommendationActionContext, setNotification]
  );

  const simulateActivePlanFailure = useCallback(() => {
    if (!activePlan) return;
    void openSimulateFailureOnCanvas(activePlan.offender, {
      selectSystem,
      setLocation,
      simulateResilienceFaultAtNode,
    });
    setActivePlan(null);
  }, [activePlan, selectSystem, setLocation, simulateResilienceFaultAtNode]);

  return (
    <div className="h-dvh w-full overflow-y-auto blueprint-grid text-slate-100 pb-safe">
      <AppHeader
        sticky
        badge="TRACELENS"
        subtitle={
          traceLensView === 'recommendations'
            ? 'Estate-wide recommendations from ChaosLens and TraceLens'
            : lookback != null
              ? `Worst offenders · lookback ${lookback}d`
              : 'Worst offenders across loaded blueprints'
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="bg-[#061125]/40 border border-[#00f0ff]/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
          <section className="relative overflow-hidden mb-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,240,255,0.08),transparent)]" />
            <div className="relative">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00f0ff] mb-3">
                {traceLensView === 'recommendations' ? 'Estate scan' : 'Risk ranking'}
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-[1.1]">
                {traceLensView === 'recommendations' ? 'All recommendations' : 'Worst offenders'}
              </h1>
              <p className="mt-3 max-w-2xl text-slate-400 text-sm sm:text-base leading-relaxed">
                {traceLensView === 'recommendations'
                  ? 'Headless ChaosLens scenarios across every loaded diagram, merged with TraceLens refactor and composite-risk signals. Click a row or action to drill in.'
                  : 'Estate-wide recommendations ranked by priority from headless ChaosLens scans and TraceLens forensics. Rows without structured advice fall back to forensics signals.'}
              </p>
            </div>
          </section>

          <ForensicsWorkspacePanel
            hasScope={hasScope}
            workspaceLabel={workspaceLabel}
            loadedCount={loadedCount}
            catalogCount={catalogCount}
            unloadedCount={unloadedCount}
            isLoading={forensicsBusy}
            pendingFolderSession={pendingFolderSession}
            pendingFolderName={pendingFolderName}
            rankLoadedOnly={rankLoadedOnly}
            onRankLoadedOnly={() => setRankLoadedOnly(true)}
            onLoadSandbox={() => void handleLoadSandbox()}
            onOpenDirectory={() => void handleOpenDirectory()}
          />

          <div className="mb-6">
            <Segmented
              value={traceLensView}
              onChange={setTraceLensView}
              options={[
                { id: 'offenders', label: 'Worst offenders' },
                { id: 'recommendations', label: 'AdviceLens' },
              ]}
            />
          </div>

          {traceLensView === 'recommendations' ? (
            <EstateRecommendationsPanel
              items={estateRanking.items}
              summary={estateRanking.summary}
              systems={loadedSystems}
              scopeEntityRef={scopeEntityRef}
              onOpenRecommendation={openRecommendationFromEstate}
              onAction={action => void handleRecommendationAction(action)}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <TraceLensScopePicker
                  options={scopeOptions}
                  value={scopeEntityRef}
                  onChange={setEntityScope}
                  disabled={!hasScope || scopeOptions.length === 0}
                />
                <Segmented
                  value={scope}
                  onChange={setScope}
                  options={[
                    { id: 'components', label: 'Components' },
                    { id: 'containers', label: 'Containers' },
                  ]}
                />
                <Segmented
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { id: 'all', label: 'All' },
                    { id: 'hotspots', label: 'Hotspots' },
                    { id: 'heating', label: 'Heating' },
                    { id: 'silos', label: 'Silos' },
                    { id: 'refactor', label: 'Refactor' },
                  ]}
                />
                <Segmented
                  value={testFilter}
                  onChange={setTestFilter}
                  options={[
                    { id: 'all', label: 'All code' },
                    { id: 'prod', label: 'Prod' },
                    { id: 'test', label: 'Tests' },
                  ]}
                />
                <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-3">
                  <ForensicsSearchbar value={searchQuery} onChange={setSearchQuery} />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    {offenders.length} ranked
                  </span>
                </div>
              </div>

              {offenders.length === 0 ? (
                <div className="rounded-xl border border-[#00f0ff]/10 bg-[#040914]/80 px-5 py-10 text-center">
                  <p className="text-sm text-slate-300">
                    {searchQuery.trim()
                      ? 'No offenders match this search.'
                      : 'No forensics offenders in this view.'}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    {searchQuery.trim()
                      ? 'Try another name, entity ref, parent, or type.'
                      : scopeEntityRef
                        ? 'No offenders in this subtree for the current filter. Try another scope or widen the signal filter.'
                        : hasScope && !hasForensicsData
                          ? 'Blueprints are loaded but have no TraceLens blocks. Re-scan with git enabled (`archlens` default) or run `archlens enrich --git` on existing YAML.'
                          : hasScope
                            ? 'No rows match this filter. Try All or Heating, or load more component diagrams.'
                            : 'Load the sandbox or open a blueprint folder above, or open a workspace on the canvas first.'}
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
