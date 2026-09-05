import { useCallback, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useShallow } from 'zustand/react/shallow';
import { buildChaosRiskContextMap } from '@archlens/core/forensics';
import { useBlueprintStore } from '../../../application/store/store';
import { filterRankedEstateItems } from '../../../application/recommendations/buildEstateRecommendations';
import { rankEstateItems } from '../../../application/recommendations/rankEstateItems';
import { buildRefactorPlanForOffender } from '../../../application/forensics/buildRefactorPlan';
import {
  findForensicsOffenderByEntityRef,
  rankForensicsOffenders,
  resolveLookbackDays,
  loadedSystemsHaveForensics,
  type OffenderScope,
  type OffenderSignalFilter,
  type OffenderTestFilter,
  type RankedOffender,
} from '../../../application/forensics/rankOffenders';
import { buildTraceLensScopeOptions } from '../../../application/forensics/buildTraceLensScopeOptions';
import { useTraceLensUrlSync } from '../forensics/useTraceLensUrlSync';
import { useTraceLensScopeLoad } from '../forensics/useTraceLensScopeLoad';
import { useTraceLensScopeFromUrl } from '../forensics/useTraceLensScopeFromUrl';
import { parseTraceLensUrl, buildTraceLensUrl } from '../forensics/traceLensUrl';
import {
  buildAdviceLensUrl,
  isAdviceLensUrl,
  parseAdviceLensUrl,
} from '../forensics/adviceLensUrl';

export type TraceLensView = 'offenders' | 'recommendations';

export type ActivePlan =
  | (ReturnType<typeof buildRefactorPlanForOffender> & {
      offender: RankedOffender;
    })
  | null;

export function useTraceLensPanelModel() {
  const {
    loadedSystems,
    workspaceCatalog,
    isWorkspaceOpen,
    isBrowserLiteWorkspace,
    isSourceCodeOpen,
    sourceCodeFilepath,
    openSourceCodeDialog,
    closeSourceCodeDialog,
    resilienceSimulationResult,
    resilienceSafeguards,
  } = useBlueprintStore(
    useShallow(state => ({
      loadedSystems: state.loadedSystems,
      workspaceCatalog: state.workspaceCatalog,
      isWorkspaceOpen: state.isWorkspaceOpen,
      isBrowserLiteWorkspace: state.isBrowserLiteWorkspace,
      isSourceCodeOpen: state.isSourceCodeOpen,
      sourceCodeFilepath: state.sourceCodeFilepath,
      openSourceCodeDialog: state.openSourceCodeDialog,
      closeSourceCodeDialog: state.closeSourceCodeDialog,
      resilienceSimulationResult: state.resilienceSimulationResult,
      resilienceSafeguards: state.resilienceSafeguards,
    }))
  );

  const [location, setLocation] = useLocation();
  const search = useSearch();
  const adviceLensActive = isAdviceLensUrl(location, search);
  const urlState = adviceLensActive
    ? parseAdviceLensUrl(location, search)
    : parseTraceLensUrl(location, search);
  const scopeEntityRef = urlState.entityRef ?? null;
  const [scope, setScope] = useState<OffenderScope>('components');
  const [filter, setFilter] = useState<OffenderSignalFilter>('all');
  const [testFilter, setTestFilter] = useState<OffenderTestFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const traceLensView: TraceLensView = adviceLensActive ? 'recommendations' : 'offenders';
  const [activePlan, setActivePlan] = useState<ActivePlan>(null);

  const clearActivePlan = useCallback(() => {
    setActivePlan(null);
    closeSourceCodeDialog();
  }, [closeSourceCodeDialog]);

  const setActivePlanFromUrl = useCallback(
    (plan: NonNullable<ActivePlan>) => setActivePlan(plan),
    []
  );

  const hasScope = loadedSystems.length > 0 || isWorkspaceOpen;
  const hasForensicsData = loadedSystemsHaveForensics(loadedSystems);
  const rankingSystems = loadedSystems;

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

  useTraceLensScopeLoad({
    scopeEntityRef,
    hasScope,
    isWorkspaceOpen,
    workspaceCatalog,
    loadedSystems,
  });

  const offenders = estateItems;

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
      setLocation(adviceLensActive ? buildAdviceLensUrl(entityRef) : buildTraceLensUrl(entityRef));
    },
    [adviceLensActive, clearActivePlan, setLocation]
  );

  const setTraceLensView = useCallback(
    (view: TraceLensView) => {
      const buildUrl = view === 'recommendations' ? buildAdviceLensUrl : buildTraceLensUrl;
      setLocation(
        buildUrl(scopeEntityRef, {
          planEntityRef: urlState.planEntityRef,
          showSource: urlState.showSource,
        }),
        { replace: true }
      );
    },
    [scopeEntityRef, setLocation, urlState.planEntityRef, urlState.showSource]
  );

  return {
    loadedSystems,
    setLocation,
    scopeEntityRef,
    urlState,
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
    setActivePlan,
    clearActivePlan,
    hasScope,
    hasForensicsData,
    isBrowserLiteWorkspace,
    estateRanking,
    offenders,
    scopeOptions,
    refactorPlanOptions,
    lookback,
    resolveSourceProvenance,
    setEntityScope,
    setTraceLensView,
  };
}

export type TraceLensPanelModel = ReturnType<typeof useTraceLensPanelModel>;
