import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { hasRemoteBuildUpdate } from '../../../application/pwa/buildInfo';
import {
  cacheBustingReloadPath,
  reloadWithoutServiceWorker,
  requestServiceWorkerUpdate,
} from '../../../application/pwa/requestServiceWorkerUpdate';
import { startPeriodicUpdateChecks } from '../../../application/pwa/updateCheck';

/**
 * Prompt when a new production build is available (service worker or index.html build id).
 */
export function UpdateBanner() {
  const registrationRef = useRef<Pick<ServiceWorkerRegistration, 'update'> | undefined>(undefined);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration;
      void requestServiceWorkerUpdate(registration);
    },
  });

  const [fallbackRefresh, setFallbackRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  const checkForRemoteUpdate = useCallback(async () => {
    const updated = await hasRemoteBuildUpdate(import.meta.env.BASE_URL);
    if (updated) setFallbackRefresh(true);
  }, []);

  useEffect(() => {
    return startPeriodicUpdateChecks({
      check: () => {
        void requestServiceWorkerUpdate(registrationRef.current);
        void checkForRemoteUpdate();
      },
      isVisible: () => document.visibilityState === 'visible',
      subscribeVisibility: onChange => {
        document.addEventListener('visibilitychange', onChange);
        return () => document.removeEventListener('visibilitychange', onChange);
      },
    });
  }, [checkForRemoteUpdate]);

  const show = needRefresh || fallbackRefresh;
  if (!show) return null;

  const refresh = () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      updateServiceWorker(false);
    } catch {
      // Waiting worker may never activate; hard reload is the source of truth.
    }
    void reloadWithoutServiceWorker({
      getRegistrations: () => navigator.serviceWorker?.getRegistrations() ?? Promise.resolve([]),
      cacheKeys: () => (typeof caches === 'undefined' ? Promise.resolve([]) : caches.keys()),
      deleteCache: cacheName => caches.delete(cacheName),
      reload: () => {
        window.history.replaceState(null, '', cacheBustingReloadPath(window.location));
        window.location.reload();
      },
    });
  };

  const dismiss = () => {
    setNeedRefresh(false);
    setFallbackRefresh(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={refreshing}
      data-testid="update-banner"
      className="fixed top-0 inset-x-0 z-[60] flex flex-wrap items-center justify-center gap-3 border-b border-accent/25 bg-surface/95 px-4 py-2 text-xs font-mono text-slate-100 backdrop-blur-md pt-[max(0.5rem,env(safe-area-inset-top))]"
    >
      <RefreshCw
        className={`size-3.5 shrink-0 text-accent ${refreshing ? 'animate-spin' : ''}`}
        aria-hidden
      />
      <span>A new version of ArchLens is available.</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          aria-busy={refreshing}
          className="rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-accent hover:bg-accent/20 transition-colors disabled:cursor-wait disabled:opacity-80"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md border border-slate-700 px-2.5 py-1 text-slate-400 hover:text-slate-200 transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}
