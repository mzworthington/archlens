import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { AppHeader } from '../../components/AppHeader';
import { useBlueprintStore } from '../../../application/store/store';
import {
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
import type { ConcernLevel } from '../../../application/forensics/concern';
import { ForensicsSearchbar } from './ForensicsSearchbar';
import { RefactorPlanSlideOver } from './RefactorPlanSlideOver';
import { ForensicsWorkspacePanel } from './ForensicsWorkspacePanel';
import { WorkspaceSourceCodeDialog } from '../workspace/components/SourceCodeDialog/WorkspaceSourceCodeDialog';
import { useTraceLensUrlSync } from './useTraceLensUrlSync';
import { parseTraceLensUrl, buildTraceLensUrl } from './traceLensUrl';

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

function formatScore(score: number): string {
  return score.toFixed(2);
}

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

function OffenderRow({
  offender,
  rank,
  filter,
  maxRefactorScore,
  onOpen,
}: {
  offender: RankedOffender;
  rank: number;
  filter: OffenderSignalFilter;
  maxRefactorScore: number;
  onOpen: (offender: RankedOffender) => void;
}) {
  const displayScore =
    filter === 'refactor'
      ? (offender.effectiveRefactorScore ?? offender.refactorScore)
      : offender.hotspotScore;
  const scoreLabel =
    filter === 'refactor'
      ? offender.effectiveRefactorScore != null &&
        offender.effectiveRefactorScore > offender.refactorScore
        ? 'priority'
        : 'refactor'
      : 'score';
  const scoreMax = filter === 'refactor' ? Math.max(maxRefactorScore, 1) : 1;
  const scorePct = Math.max(0, Math.min(100, Math.round((displayScore / scoreMax) * 100)));
  const signals = [
    filter === 'refactor' ? 'REFACTOR' : null,
    offender.classifications.includes('hotspot') ? 'HOT' : null,
    offender.classifications.includes('knowledge-silo') ? 'SILO' : null,
    offender.compositeRiskScore != null && offender.compositeRiskScore > 0 ? 'CHAOS' : null,
  ].filter(Boolean) as string[];

  return (
    <button
      type="button"
      onClick={() => onOpen(offender)}
      className={`w-full text-left grid grid-cols-[2.5rem_minmax(0,1.4fr)_minmax(0,1fr)_7rem_minmax(0,1fr)] gap-3 items-center rounded-xl border bg-[#040914]/60 px-3 py-3 transition-colors ${rowBorder(offender.concern.level)}`}
      data-testid={`offender-row-${offender.entityRef}`}
    >
      <span className="font-mono text-xs text-slate-500 tabular-nums">#{rank}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{offender.name}</p>
        <p className="truncate font-mono text-[10px] text-slate-500">{offender.type}</p>
      </div>
      <p className="min-w-0 truncate text-xs text-slate-400">{offender.parentLabel}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] text-slate-500">{scoreLabel}</span>
          <span className="font-mono text-[10px] text-slate-300">
            {filter === 'refactor' ? Math.round(displayScore) : formatScore(displayScore)}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
          <div
            className={`h-full rounded-full ${scoreBarColor(offender.concern.level)}`}
            style={{ width: `${scorePct}%` }}
          />
        </div>
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
                  : signal === 'CHAOS'
                    ? 'bg-red-950/50 text-red-300 border-red-900/50'
                    : 'bg-amber-950/50 text-amber-300 border-amber-900/50'
            }`}
          >
            {signal}
          </span>
        ))}
        <span className="font-mono text-[10px] text-slate-500 truncate">
          {[
            offender.dependencyCount > 0 ? `deps ${offender.dependencyCount}` : null,
            offender.complexity != null ? `cx ${offender.complexity}` : null,
            offender.churn != null ? `churn ${offender.churn}` : null,
            offender.compositeRiskScore != null
              ? `risk ${offender.compositeRiskScore.toFixed(2)}`
              : null,
            offender.authorCount != null ? `authors ${offender.authorCount}` : null,
            offender.hotspotCount != null ? `hots ${offender.hotspotCount}` : null,
            offender.knowledgeSiloCount != null ? `silos ${offender.knowledgeSiloCount}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
    </button>
  );
}

export const ForensicsPage: React.FC = () => {
  const loadedSystems = useBlueprintStore(s => s.loadedSystems);
  const workspaceCatalog = useBlueprintStore(s => s.workspaceCatalog);
  const isWorkspaceOpen = useBlueprintStore(s => s.isWorkspaceOpen);
  const workspaceName = useBlueprintStore(s => s.workspaceName);
  const isLoading = useBlueprintStore(s => s.isLoading);
  const loadBundledSandbox = useBlueprintStore(s => s.loadBundledSandbox);
  const openWorkspaceDirectory = useBlueprintStore(s => s.openWorkspaceDirectory);
  const prefetchAllWorkspaceSystems = useBlueprintStore(s => s.prefetchAllWorkspaceSystems);
  const selectSystem = useBlueprintStore(s => s.selectSystem);
  const selectNode = useBlueprintStore(s => s.selectNode);
  const setShowCoupling = useBlueprintStore(s => s.setShowCoupling);
  const setGuidedRefactorEntityRefs = useBlueprintStore(s => s.setGuidedRefactorEntityRefs);
  const isSourceCodeOpen = useBlueprintStore(s => s.isSourceCodeOpen);
  const sourceCodeFilepath = useBlueprintStore(s => s.sourceCodeFilepath);
  const openSourceCodeDialog = useBlueprintStore(s => s.openSourceCodeDialog);
  const closeSourceCodeDialog = useBlueprintStore(s => s.closeSourceCodeDialog);
  const resilienceSimulationResult = useBlueprintStore(s => s.resilienceSimulationResult);
  const resilienceSafeguards = useBlueprintStore(s => s.resilienceSafeguards);
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const urlState = parseTraceLensUrl(location, search);
  const scopeEntityRef = urlState.entityRef ?? null;
  const [scope, setScope] = useState<OffenderScope>('components');
  const [filter, setFilter] = useState<OffenderSignalFilter>('all');
  const [testFilter, setTestFilter] = useState<OffenderTestFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
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

  const loadedCount = loadedSystems.length;
  const catalogCount = workspaceCatalog.length > 0 ? workspaceCatalog.length : loadedCount;
  const unloadedCount = useMemo(
    () =>
      workspaceCatalog.filter(entry => !loadedSystems.some(system => system.path === entry.path))
        .length,
    [workspaceCatalog, loadedSystems]
  );
  const hasScope = loadedCount > 0 || isWorkspaceOpen;
  const hasForensicsData = loadedSystemsHaveForensics(loadedSystems);
  const workspaceLabel = isWorkspaceOpen ? workspaceName || 'Workspace folder' : 'Bundled sandbox';

  const chaosContext = useMemo(
    () => buildChaosRiskContextMap(loadedSystems, resilienceSimulationResult, resilienceSafeguards),
    [loadedSystems, resilienceSimulationResult, resilienceSafeguards]
  );

  const ranked = useMemo(
    () => rankForensicsOffenders(loadedSystems, scope, filter, chaosContext, testFilter),
    [loadedSystems, scope, filter, chaosContext, testFilter]
  );

  useEffect(() => {
    if (!hasScope) return;
    if (unloadedCount > 0 || (!isWorkspaceOpen && loadedCount > 0)) {
      void prefetchAllWorkspaceSystems();
    }
  }, [hasScope, unloadedCount, isWorkspaceOpen, loadedCount, prefetchAllWorkspaceSystems]);

  const handleLoadSandbox = useCallback(async () => {
    await loadBundledSandbox();
    await prefetchAllWorkspaceSystems();
  }, [loadBundledSandbox, prefetchAllWorkspaceSystems]);

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

  const offenders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return scopedOffenders;
    return scopedOffenders.filter(
      o =>
        o.name.toLowerCase().includes(q) ||
        o.entityRef.toLowerCase().includes(q) ||
        o.parentLabel.toLowerCase().includes(q) ||
        o.type.toLowerCase().includes(q)
    );
  }, [scopedOffenders, searchQuery]);

  const scopeLabel = useMemo(() => {
    if (!scopeEntityRef) return null;
    for (const system of loadedSystems) {
      const node = system.schema.nodes.find(n => n.entityRef === scopeEntityRef);
      if (node) return node.name;
    }
    const parts = scopeEntityRef.split('/');
    return parts[parts.length - 1] || scopeEntityRef;
  }, [loadedSystems, scopeEntityRef]);

  const legacyPlanEntityRef = useMemo(() => {
    if (urlState.planEntityRef || !scopeEntityRef) return null;
    if (scopedOffenders.length !== 1 || scopedOffenders[0].entityRef !== scopeEntityRef)
      return null;
    return scopeEntityRef;
  }, [urlState.planEntityRef, scopeEntityRef, scopedOffenders]);

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
  });

  const lookback = useMemo(() => resolveLookbackDays(ranked), [ranked]);
  const maxRefactorScore = useMemo(
    () => Math.max(...ranked.map(o => o.effectiveRefactorScore ?? o.refactorScore), 0),
    [ranked]
  );

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

  const openOffender = (offender: RankedOffender) => {
    const plan = buildRefactorPlanForOffender(offender, loadedSystems);
    if (!plan.boundary) return;
    setActivePlan({ offender, ...plan });
    const planScope = scopeEntityRef ?? offender.entityRef;
    setLocation(buildTraceLensUrl(planScope, { planEntityRef: offender.entityRef }), {
      replace: true,
    });
  };

  const clearScope = () => {
    clearActivePlan();
    setLocation('/tracelens');
  };

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

  return (
    <div className="h-dvh w-full overflow-y-auto blueprint-grid text-slate-100 pb-safe">
      <AppHeader
        sticky
        badge="TRACELENS"
        subtitle={
          lookback != null
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
                Risk ranking
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-[1.1]">
                Worst offenders
              </h1>
              <p className="mt-3 max-w-2xl text-slate-400 text-sm sm:text-base leading-relaxed">
                Components and containers ranked by hotspot score, refactor candidates, knowledge
                silos, and complexity - open any row for a guided refactor plan.
              </p>
            </div>
          </section>

          <ForensicsWorkspacePanel
            hasScope={hasScope}
            workspaceLabel={workspaceLabel}
            loadedCount={loadedCount}
            catalogCount={catalogCount}
            unloadedCount={unloadedCount}
            isLoading={isLoading}
            onLoadSandbox={() => void handleLoadSandbox()}
            onOpenDirectory={() => void handleOpenDirectory()}
          />

          {scopeEntityRef ? (
            <div
              className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#00f0ff]/15 bg-[#040914]/60 px-3 py-2"
              data-testid="tracelens-scope-banner"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                Scoped to
              </span>
              <span className="text-sm font-semibold text-white">{scopeLabel}</span>
              <span className="font-mono text-[10px] text-slate-500 truncate">
                {scopeEntityRef}
              </span>
              <button
                type="button"
                onClick={clearScope}
                className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[#00f0ff] hover:text-[#00f0ff]/80 cursor-pointer"
                data-testid="tracelens-clear-scope"
              >
                Clear scope
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 mb-6">
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
              <div className="hidden md:grid grid-cols-[2.5rem_minmax(0,1.4fr)_minmax(0,1fr)_7rem_minmax(0,1fr)] gap-3 px-3 pb-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <span>#</span>
                <span>Name</span>
                <span>Parent</span>
                <span>Score</span>
                <span className="text-right">Signals</span>
              </div>
              {offenders.map((offender, index) => (
                <OffenderRow
                  key={offender.entityRef}
                  offender={offender}
                  rank={index + 1}
                  filter={filter}
                  maxRefactorScore={maxRefactorScore}
                  onOpen={openOffender}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {activePlan?.boundary ? (
        <RefactorPlanSlideOver
          offender={activePlan.offender}
          boundary={activePlan.boundary}
          ownership={activePlan.ownership}
          suggestions={activePlan.suggestions}
          coupledFiles={activePlan.coupledFiles}
          resolveSourceProvenance={resolveSourceProvenance}
          onClose={clearActivePlan}
          onOpenCanvas={openPlanOnCanvas}
        />
      ) : null}
      <WorkspaceSourceCodeDialog />
    </div>
  );
};
