import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import {
  buildTraceLensUrl,
  isTraceLensUrl,
  workspaceEntityRefFromPath,
} from '../../forensics/traceLensUrl';
import {
  buildChaosLensUrl,
  clearChaosLensSearchParams,
  isChaosLensUrl,
  parseChaosLensUrl,
  redirectLegacyResilienceUrl,
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
  const applyResilienceUrlState = useBlueprintStore(s => s.applyResilienceUrlState);
  const applyingUrlRef = useRef(false);

  // Legacy `?resilience=1` → sticky `?lens=chaoslens`
  useEffect(() => {
    const query = search.startsWith('?') ? search.slice(1) : search;
    const params = new URLSearchParams(query);
    if (params.get('resilience') !== '1') return;
    setLocation(redirectLegacyResilienceUrl(location, search), { replace: true });
  }, [location, search, setLocation]);

  useEffect(() => {
    const active = isTraceLensUrl(location, search);
    if (active !== isTraceLensMode) {
      setTraceLensMode(active);
    }
  }, [location, search, isTraceLensMode, setTraceLensMode]);

  // URL → ChaosLens mode + faults.
  // Depend only on the URL — not store faults — so adding a fault cannot re-apply a
  // stale empty URL and wipe the scenario before store→URL rewrites the query.
  useEffect(() => {
    const active = isChaosLensUrl(location, search);
    if (!active) return;
    if (isTraceLensUrl(location, search)) return;

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

  // Store → ChaosLens URL while resilience mode is active
  useEffect(() => {
    if (!isResilienceMode) return;
    if (applyingUrlRef.current) return;
    if (isTraceLensUrl(location, search)) return;

    const entityRef = workspaceEntityRefFromPath(location);
    const desired = buildChaosLensUrl(entityRef, { faults: resilienceFaults });
    if (currentUrl(location, search) === desired) return;
    setLocation(desired, { replace: true });
  }, [isResilienceMode, resilienceFaults, location, search, setLocation]);
}

export function useTraceLensNavigation() {
  const [, setLocation] = useLocation();
  const setTraceLensMode = useBlueprintStore(s => s.setTraceLensMode);

  const enterTraceLens = useCallback(
    (scopeEntityRef?: string | null, options?: Parameters<typeof buildTraceLensUrl>[1]) => {
      setTraceLensMode(true);
      setLocation(buildTraceLensUrl(scopeEntityRef, options));
    },
    [setLocation, setTraceLensMode]
  );

  const exitTraceLens = useCallback(() => {
    setTraceLensMode(false);
    const params = new URLSearchParams(window.location.search);
    params.delete('lens');
    params.delete('view');
    params.delete('plan');
    params.delete('source');
    const query = params.toString();
    setLocation(`${window.location.pathname}${query ? `?${query}` : ''}`, { replace: true });
  }, [setLocation, setTraceLensMode]);

  return { enterTraceLens, exitTraceLens };
}

export function useChaosLensNavigation() {
  const [location, setLocation] = useLocation();
  const setResilienceMode = useBlueprintStore(s => s.setResilienceMode);
  const resilienceFaults = useBlueprintStore(s => s.resilienceFaults);

  const enterChaosLens = useCallback(() => {
    setResilienceMode(true);
    setLocation(
      buildChaosLensUrl(workspaceEntityRefFromPath(location), { faults: resilienceFaults }),
      { replace: true }
    );
  }, [location, resilienceFaults, setLocation, setResilienceMode]);

  const exitChaosLens = useCallback(() => {
    setResilienceMode(false);
    const cleared = clearChaosLensSearchParams(window.location.search);
    setLocation(`${window.location.pathname}${cleared ? `?${cleared}` : ''}`, { replace: true });
  }, [setLocation, setResilienceMode]);

  return { enterChaosLens, exitChaosLens };
}
