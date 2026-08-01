import { useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../application/store/store';
import { buildTraceLensUrl, isTraceLensUrl } from '../../forensics/traceLensUrl';

/** Sync TraceLens mode with `?lens=tracelens` on workspace routes. */
export function useWorkspaceLensSync(): void {
  const [location] = useLocation();
  const isTraceLensMode = useBlueprintStore(s => s.isTraceLensMode);
  const setTraceLensMode = useBlueprintStore(s => s.setTraceLensMode);

  useEffect(() => {
    const search = window.location.search;
    const active = isTraceLensUrl(location, search);
    if (active !== isTraceLensMode) {
      setTraceLensMode(active);
    }
  }, [location, isTraceLensMode, setTraceLensMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('resilience') !== '1') return;
    useBlueprintStore.getState().setResilienceMode(true);
    params.delete('resilience');
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
  }, []);
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
