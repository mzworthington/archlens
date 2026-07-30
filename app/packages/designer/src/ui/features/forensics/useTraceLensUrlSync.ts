import { useEffect, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import type { LoadedSystemRef } from '../../../application/forensics/rankOffenders';
import { findForensicsOffenderByEntityRef } from '../../../application/forensics/rankOffenders';
import { buildRefactorPlanForOffender } from '../../../application/forensics/buildRefactorPlan';
import type { RankedOffender } from '../../../application/forensics/rankOffenders';
import { buildTraceLensUrl, currentTraceLensUrl, parseTraceLensUrl } from './traceLensUrl';

type ActivePlan = ReturnType<typeof buildRefactorPlanForOffender> & {
  offender: RankedOffender;
};

function resolveOffenderFilepath(
  loadedSystems: LoadedSystemRef[],
  entityRef: string
): string | null {
  const offender = findForensicsOffenderByEntityRef(loadedSystems, entityRef);
  if (!offender) return null;
  const plan = buildRefactorPlanForOffender(offender, loadedSystems);
  return plan.boundary?.members.find(m => m.entityRef === entityRef)?.filepath ?? null;
}

export function useTraceLensUrlSync({
  loadedSystems,
  scopeEntityRef,
  legacyPlanEntityRef,
  activePlanEntityRef,
  setActivePlan,
  clearActivePlan,
  isSourceCodeOpen,
  sourceCodeFilepath,
  openSourceCodeDialog,
  closeSourceCodeDialog,
}: {
  loadedSystems: LoadedSystemRef[];
  scopeEntityRef: string | null;
  /** Path-only deep link to a single offender (no ?plan=). */
  legacyPlanEntityRef: string | null;
  activePlanEntityRef: string | null;
  setActivePlan: (plan: ActivePlan) => void;
  clearActivePlan: () => void;
  isSourceCodeOpen: boolean;
  sourceCodeFilepath: string | null;
  openSourceCodeDialog: (filepath: string) => void;
  closeSourceCodeDialog: () => void;
}): void {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const prevLocationRef = useRef<string | null>(null);
  const prevPlanEntityRef = useRef<string | null | undefined>(undefined);
  const prevSourceOpenRef = useRef<boolean | undefined>(undefined);
  const dismissedLegacyPlanRef = useRef(false);

  // URL → UI (navigation, deep links, back/forward)
  useEffect(() => {
    if (!location.startsWith('/tracelens')) return;

    const browserUrl = currentTraceLensUrl(location, search);
    const locationChanged = prevLocationRef.current !== browserUrl;
    const isInitialSync = prevLocationRef.current === null;
    prevLocationRef.current = browserUrl;

    if (locationChanged) {
      dismissedLegacyPlanRef.current = false;
    }

    if (!locationChanged && !isInitialSync) return;

    const parsed = parseTraceLensUrl(location, search);
    const planEntityRef =
      parsed.planEntityRef ??
      (!dismissedLegacyPlanRef.current ? legacyPlanEntityRef : null) ??
      null;

    if (!planEntityRef) {
      if (activePlanEntityRef) clearActivePlan();
    } else if (planEntityRef !== activePlanEntityRef) {
      const offender = findForensicsOffenderByEntityRef(loadedSystems, planEntityRef);
      if (offender) {
        const plan = buildRefactorPlanForOffender(offender, loadedSystems);
        if (plan.boundary) setActivePlan({ offender, ...plan });
      }
    }

    if (!parsed.showSource && isSourceCodeOpen) {
      closeSourceCodeDialog();
    }
  }, [
    location,
    search,
    loadedSystems,
    activePlanEntityRef,
    isSourceCodeOpen,
    setActivePlan,
    clearActivePlan,
    closeSourceCodeDialog,
    legacyPlanEntityRef,
  ]);

  // Open source after entity plan is active (zustand + react state can desync on hydration).
  useEffect(() => {
    if (!location.startsWith('/tracelens')) return;

    const parsed = parseTraceLensUrl(location, search);
    if (!parsed.showSource || !activePlanEntityRef) return;

    const filepath =
      sourceCodeFilepath ?? resolveOffenderFilepath(loadedSystems, activePlanEntityRef);
    if (!filepath) return;
    if (isSourceCodeOpen && sourceCodeFilepath === filepath) return;

    openSourceCodeDialog(filepath);
  }, [
    location,
    search,
    loadedSystems,
    activePlanEntityRef,
    isSourceCodeOpen,
    sourceCodeFilepath,
    openSourceCodeDialog,
  ]);

  // UI → URL (user opened/closed plan or source)
  useEffect(() => {
    if (!location.startsWith('/tracelens')) return;

    const planChanged = prevPlanEntityRef.current !== activePlanEntityRef;
    const sourceChanged = prevSourceOpenRef.current !== isSourceCodeOpen;
    const isInitialSync = prevPlanEntityRef.current === undefined;

    if (planChanged && activePlanEntityRef === null && prevPlanEntityRef.current) {
      dismissedLegacyPlanRef.current = true;
    }

    prevPlanEntityRef.current = activePlanEntityRef;
    prevSourceOpenRef.current = isSourceCodeOpen;

    if (isInitialSync) return;
    if (!planChanged && !sourceChanged) return;

    const parsed = parseTraceLensUrl(location, search);
    const showSource = isSourceCodeOpen || (parsed.showSource && !sourceChanged);
    const targetUrl = buildTraceLensUrl(scopeEntityRef, {
      planEntityRef: activePlanEntityRef,
      showSource,
    });

    if (currentTraceLensUrl(location, search) !== targetUrl) {
      setLocation(targetUrl, { replace: true });
    }
  }, [location, search, scopeEntityRef, activePlanEntityRef, isSourceCodeOpen, setLocation]);
}
