import { isBenignServiceWorkerUpdateFailure } from './benignServiceWorkerUpdateFailure';

const REFRESH_QUERY_PARAM = 'al_refresh';

export type ServiceWorkerReload = {
  getRegistrations: () => Promise<ReadonlyArray<{ unregister: () => Promise<boolean> }>>;
  cacheKeys?: () => Promise<readonly string[]>;
  deleteCache?: (cacheName: string) => Promise<boolean>;
  reload: () => void;
  skipWaiting?: () => void;
};

/** Cache-bust the next document URL so HTTP cache cannot reuse the old shell. */
export function cacheBustingReloadUrl(href: string, now: number = Date.now()): string {
  const url = new URL(href);
  url.searchParams.set(REFRESH_QUERY_PARAM, String(now));
  return url.toString();
}

/** Drop a wedged controller so the next load is not served from a stale app shell. */
export async function reloadWithoutServiceWorker({
  getRegistrations,
  cacheKeys,
  deleteCache,
  reload,
  skipWaiting,
}: ServiceWorkerReload): Promise<void> {
  try {
    skipWaiting?.();
  } catch {
    // Waiting worker may be missing or broken (install TypeError).
  }

  try {
    const registrations = await getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
  } catch {
    // Unregister can fail when the worker is wedged; still drop caches and reload.
  }

  try {
    if (cacheKeys && deleteCache) {
      const keys = await cacheKeys();
      await Promise.all(keys.map(cacheName => deleteCache(cacheName)));
    }
  } catch {
    // Cache Storage may be unavailable; reload anyway.
  }

  reload();
}

export function requestServiceWorkerUpdate(
  registration: Pick<ServiceWorkerRegistration, 'update'> | undefined
): Promise<void> {
  if (!registration) return Promise.resolve();
  return registration
    .update()
    .then(() => undefined)
    .catch((error: unknown) => {
      if (isBenignServiceWorkerUpdateFailure(error)) return;
      throw error;
    });
}
