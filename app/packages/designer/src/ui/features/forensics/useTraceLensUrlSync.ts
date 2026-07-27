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
  activeEntityRef,
  setActivePlan,
  clearActivePlan,
  isSourceCodeOpen,
  sourceCodeFilepath,
  openSourceCodeDialog,
  closeSourceCodeDialog,
}: {
  loadedSystems: LoadedSystemRef[];
  activeEntityRef: string | null;
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
  const prevEntityRefRef = useRef<string | null | undefined>(undefined);
  const prevSourceOpenRef = useRef<boolean | undefined>(undefined);

  // URL → UI (navigation, deep links, back/forward)
  useEffect(() => {
    if (!location.startsWith('/tracelens')) return;

    const browserUrl = currentTraceLensUrl(location, search);
    const locationChanged = prevLocationRef.current !== browserUrl;
    const isInitialSync = prevLocationRef.current === null;
    prevLocationRef.current = browserUrl;

    if (!locationChanged && !isInitialSync) return;

    const parsed = parseTraceLensUrl(location, search);

    if (!parsed.entityRef) {
      if (activeEntityRef) clearActivePlan();
    } else if (parsed.entityRef !== activeEntityRef) {
      const offender = findForensicsOffenderByEntityRef(loadedSystems, parsed.entityRef);
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
    activeEntityRef,
    isSourceCodeOpen,
    setActivePlan,
    clearActivePlan,
    closeSourceCodeDialog,
  ]);

  // Open source after entity plan is active (zustand + react state can desync on hydration).
  useEffect(() => {
    if (!location.startsWith('/tracelens')) return;

    const parsed = parseTraceLensUrl(location, search);
    if (!parsed.showSource || !parsed.entityRef) return;
    if (parsed.entityRef !== activeEntityRef) return;

    const filepath = sourceCodeFilepath ?? resolveOffenderFilepath(loadedSystems, parsed.entityRef);
    if (!filepath) return;
    if (isSourceCodeOpen && sourceCodeFilepath === filepath) return;

    openSourceCodeDialog(filepath);
  }, [
    location,
    search,
    loadedSystems,
    activeEntityRef,
    isSourceCodeOpen,
    sourceCodeFilepath,
    openSourceCodeDialog,
  ]);

  // UI → URL (user opened/closed plan or source)
  useEffect(() => {
    if (!location.startsWith('/tracelens')) return;

    const entityChanged = prevEntityRefRef.current !== activeEntityRef;
    const sourceChanged = prevSourceOpenRef.current !== isSourceCodeOpen;
    const isInitialSync = prevEntityRefRef.current === undefined;

    prevEntityRefRef.current = activeEntityRef;
    prevSourceOpenRef.current = isSourceCodeOpen;

    if (isInitialSync) return;
    if (!entityChanged && !sourceChanged) return;

    const parsed = parseTraceLensUrl(location, search);
    const showSource =
      isSourceCodeOpen ||
      (parsed.showSource && activeEntityRef != null && parsed.entityRef === activeEntityRef);
    const targetUrl = buildTraceLensUrl(activeEntityRef, showSource);

    if (currentTraceLensUrl(location, search) !== targetUrl) {
      setLocation(targetUrl, { replace: true });
    }
  }, [location, search, activeEntityRef, isSourceCodeOpen, setLocation]);
}
