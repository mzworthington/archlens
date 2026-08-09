import { useEffect, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import { workspaceEntityRefFromPath } from '../../../../application/navigation/workspaceUrl';
import { isTraceLensUrl } from '../../forensics/traceLensUrl';
import { isAdviceLensUrl, isEstateLensUrl } from '../../forensics/adviceLensUrl';
import {
  buildChaosLensUrl,
  isChaosLensUrl,
  parseChaosLensUrl,
  resilienceFaultsEqual,
} from '../../../../application/resilience/chaosLensUrl';

function currentUrl(pathname: string, search: string): string {
  const query = search.startsWith('?') ? search.slice(1) : search;
  return query ? `${pathname}?${query}` : pathname;
}

/** Sync TraceLens / ChaosLens mode with workspace query params. */
export function useWorkspaceLensSync(): void {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const isTraceLensMode = useBlueprintStore(s => s.isTraceLensMode);
  const setTraceLensMode = useBlueprintStore(s => s.setTraceLensMode);
  const isResilienceMode = useBlueprintStore(s => s.isResilienceMode);
  const resilienceFaults = useBlueprintStore(s => s.resilienceFaults);
  const isChaosSpecPickerOpen = useBlueprintStore(s => s.isChaosSpecPickerOpen);
  const openChaosSpecPicker = useBlueprintStore(s => s.openChaosSpecPicker);
  const closeChaosSpecPicker = useBlueprintStore(s => s.closeChaosSpecPicker);
  const applyResilienceUrlState = useBlueprintStore(s => s.applyResilienceUrlState);
  const applyingUrlRef = useRef(false);

  useEffect(() => {
    const active = isEstateLensUrl(location, search);
    if (active !== isTraceLensMode) {
      setTraceLensMode(active);
    }
  }, [location, search, isTraceLensMode, setTraceLensMode]);

  // URL → ChaosLens mode + faults.
  // Depend only on the URL - not store faults - so adding a fault cannot re-apply a
  // stale empty URL and wipe the scenario before store→URL rewrites the query.
  useEffect(() => {
    const active = isChaosLensUrl(location, search);
    if (!active) return;
    if (isTraceLensUrl(location, search)) return;
    if (isAdviceLensUrl(location, search)) return;

    const parsed = parseChaosLensUrl(location, search);
    const state = useBlueprintStore.getState();
    if (state.isResilienceMode && resilienceFaultsEqual(state.resilienceFaults, parsed.faults)) {
      return;
    }

    applyingUrlRef.current = true;
    applyResilienceUrlState(parsed.faults);
    queueMicrotask(() => {
      applyingUrlRef.current = false;
    });
  }, [location, search, applyResilienceUrlState]);

  // URL → Browse ChaosSpecs picker (`browse=chaosspecs`).
  // Depend on URL only - reading store via getState avoids closing a UI-opened picker
  // before store→URL has written `browse=chaosspecs`.
  useEffect(() => {
    if (!isChaosLensUrl(location, search)) {
      if (useBlueprintStore.getState().isChaosSpecPickerOpen) {
        closeChaosSpecPicker();
      }
      return;
    }
    if (isTraceLensUrl(location, search) || isAdviceLensUrl(location, search)) return;

    const wantOpen = parseChaosLensUrl(location, search).browseChaosSpecs;
    const isOpen = useBlueprintStore.getState().isChaosSpecPickerOpen;
    if (wantOpen && !isOpen) openChaosSpecPicker();
    else if (!wantOpen && isOpen) closeChaosSpecPicker();
  }, [location, search, openChaosSpecPicker, closeChaosSpecPicker]);

  // Store → ChaosLens URL while resilience mode is active
  useEffect(() => {
    if (!isResilienceMode) return;
    if (applyingUrlRef.current) return;
    if (isTraceLensUrl(location, search)) return;
    if (isAdviceLensUrl(location, search)) return;

    const entityRef = workspaceEntityRefFromPath(location);
    const desired = buildChaosLensUrl(entityRef, {
      faults: resilienceFaults,
      browseChaosSpecs: isChaosSpecPickerOpen,
    });
    if (currentUrl(location, search) === desired) return;
    setLocation(desired, { replace: true });
  }, [isResilienceMode, resilienceFaults, isChaosSpecPickerOpen, location, search, setLocation]);
}
