import { useEffect, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import type { LoadedSystemRef } from '../../../application/forensics/rankOffenders';
import { findForensicsOffenderByEntityRef } from '../../../application/forensics/rankOffenders';
import {
  buildRefactorPlanForOffender,
  type BuildRefactorPlanOptions,
} from '../../../application/forensics/buildRefactorPlan';
import type { RankedOffender } from '../../../application/forensics/rankOffenders';
import { buildTraceLensUrl, currentTraceLensUrl, parseTraceLensUrl } from './traceLensUrl';
import {
  buildAdviceLensUrl,
  isAdviceLensUrl,
  isEstateLensUrl,
  parseAdviceLensUrl,
} from './adviceLensUrl';

type ActivePlan = ReturnType<typeof buildRefactorPlanForOffender> & {
  offender: RankedOffender;
};

function resolveOffenderFilepath(
  loadedSystems: LoadedSystemRef[],
  entityRef: string,
  planOptions?: BuildRefactorPlanOptions
): string | null {
  const offender = findForensicsOffenderByEntityRef(loadedSystems, entityRef);
  if (!offender) return null;
  const plan = buildRefactorPlanForOffender(offender, loadedSystems, planOptions);
  return plan.boundary?.members.find(m => m.entityRef === entityRef)?.filepath ?? null;
}

export function useTraceLensUrlSync({
  loadedSystems,
  scopeEntityRef,
  activePlanEntityRef,
  setActivePlan,
  clearActivePlan,
  isSourceCodeOpen,
  sourceCodeFilepath,
  openSourceCodeDialog,
  closeSourceCodeDialog,
  refactorPlanOptions,
}: {
  loadedSystems: LoadedSystemRef[];
  scopeEntityRef: string | null;
  activePlanEntityRef: string | null;
  setActivePlan: (plan: ActivePlan) => void;
  clearActivePlan: () => void;
  isSourceCodeOpen: boolean;
  sourceCodeFilepath: string | null;
  openSourceCodeDialog: (filepath: string) => void;
  closeSourceCodeDialog: () => void;
  refactorPlanOptions?: BuildRefactorPlanOptions;
}): void {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const prevLocationRef = useRef<string | null>(null);
  const prevPlanEntityRef = useRef<string | null | undefined>(undefined);
  const prevSourceOpenRef = useRef<boolean | undefined>(undefined);

  const adviceLensActive = isAdviceLensUrl(location, search);

  // URL → UI (navigation, deep links, back/forward)
  useEffect(() => {
    if (!isEstateLensUrl(location, search)) return;

    const browserUrl = currentTraceLensUrl(location, search);
    const locationChanged = prevLocationRef.current !== browserUrl;
    const isInitialSync = prevLocationRef.current === null;
    prevLocationRef.current = browserUrl;

    if (!locationChanged && !isInitialSync) return;

    const parsed = adviceLensActive
      ? parseAdviceLensUrl(location, search)
      : parseTraceLensUrl(location, search);
    const planEntityRef = parsed.planEntityRef ?? null;

    if (!planEntityRef) {
      if (activePlanEntityRef) clearActivePlan();
    } else if (planEntityRef !== activePlanEntityRef) {
      const offender = findForensicsOffenderByEntityRef(loadedSystems, planEntityRef);
      if (offender) {
        const plan = buildRefactorPlanForOffender(offender, loadedSystems, refactorPlanOptions);
        if (plan.boundary) setActivePlan({ offender, ...plan });
      }
    }

    if (!parsed.showSource && isSourceCodeOpen) {
      closeSourceCodeDialog();
    }
  }, [
    location,
    search,
    adviceLensActive,
    loadedSystems,
    activePlanEntityRef,
    isSourceCodeOpen,
    setActivePlan,
    clearActivePlan,
    closeSourceCodeDialog,
    refactorPlanOptions,
  ]);

  // Open source after entity plan is active (zustand + react state can desync on hydration).
  useEffect(() => {
    if (!isEstateLensUrl(location, search)) return;

    const parsed = adviceLensActive
      ? parseAdviceLensUrl(location, search)
      : parseTraceLensUrl(location, search);
    if (!parsed.showSource || !activePlanEntityRef) return;

    const filepath =
      sourceCodeFilepath ??
      resolveOffenderFilepath(loadedSystems, activePlanEntityRef, refactorPlanOptions);
    if (!filepath) return;
    if (isSourceCodeOpen && sourceCodeFilepath === filepath) return;

    openSourceCodeDialog(filepath);
  }, [
    location,
    search,
    adviceLensActive,
    loadedSystems,
    activePlanEntityRef,
    isSourceCodeOpen,
    sourceCodeFilepath,
    openSourceCodeDialog,
    refactorPlanOptions,
  ]);

  // UI → URL (user opened/closed plan or source)
  useEffect(() => {
    if (!isEstateLensUrl(location, search)) return;

    const planChanged = prevPlanEntityRef.current !== activePlanEntityRef;
    const sourceChanged = prevSourceOpenRef.current !== isSourceCodeOpen;
    const isInitialSync = prevPlanEntityRef.current === undefined;

    prevPlanEntityRef.current = activePlanEntityRef;
    prevSourceOpenRef.current = isSourceCodeOpen;

    if (isInitialSync) return;
    if (!planChanged && !sourceChanged) return;

    const parsed = adviceLensActive
      ? parseAdviceLensUrl(location, search)
      : parseTraceLensUrl(location, search);
    const showSource = isSourceCodeOpen || (parsed.showSource && !sourceChanged);
    const buildUrl = adviceLensActive ? buildAdviceLensUrl : buildTraceLensUrl;
    const targetUrl = buildUrl(scopeEntityRef, {
      planEntityRef: activePlanEntityRef,
      showSource,
    });

    if (currentTraceLensUrl(location, search) !== targetUrl) {
      setLocation(targetUrl, { replace: true });
    }
  }, [
    location,
    search,
    scopeEntityRef,
    activePlanEntityRef,
    isSourceCodeOpen,
    setLocation,
    adviceLensActive,
  ]);
}
