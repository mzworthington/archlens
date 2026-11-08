import { resolvePageSeo } from '../../ui/features/docs/seo/siteSeo';
import { isBenignServiceWorkerUpdateFailure } from './benignServiceWorkerUpdateFailure';

export const UPDATE_REFRESH_QUERY_PARAM = 'al_refresh';

/** Stop waiting on a wedged worker so Refresh still navigates. */
const SERVICE_WORKER_RELOAD_DEADLINE_MS = 1000;

export type ServiceWorkerReload = {
  getRegistrations: () => Promise<ReadonlyArray<{ unregister: () => Promise<boolean> }>>;
  cacheKeys?: () => Promise<readonly string[]>;
  deleteCache?: (cacheName: string) => Promise<boolean>;
  reload: () => void;
  skipWaiting?: () => void;
  deadlineMs?: number;
};

/** Cache-bust the next document URL so HTTP cache cannot reuse the old shell. */
export function cacheBustingReloadUrl(href: string, now: number = Date.now()): string {
  const url = new URL(href);
  url.searchParams.set(UPDATE_REFRESH_QUERY_PARAM, String(now));
  return url.toString();
}

/** Same-origin relative path so `location.replace` cannot open-redirect off-site. */
export function cacheBustingReloadPath(
  location: Pick<Location, 'pathname' | 'search' | 'hash'>,
  now: number = Date.now()
): string {
  const url = new URL(
    `${location.pathname}${location.search}${location.hash}`,
    'https://archlens.invalid'
  );
  url.searchParams.set(UPDATE_REFRESH_QUERY_PARAM, String(now));
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Client-only routes are not prerendered (`emitSiteSeo` writes indexable pages
 * only, and Pages has no SPA fallback). The real document is the site shell.
 */
function isShellOnlyPath(pathname: string): boolean {
  return !resolvePageSeo(pathname).indexable;
}

/**
 * Network URL for a Refresh navigation.
 * Shell-only routes must fetch `/` or the request 404s and the precached shell
 * would bring the banner back. Prerendered website pages are real files.
 */
export function refreshNetworkUrl(url: URL): string {
  const token = url.searchParams.get(UPDATE_REFRESH_QUERY_PARAM) ?? '';
  if (isShellOnlyPath(url.pathname)) {
    const shell = new URL('/', url.origin);
    if (token) shell.searchParams.set(UPDATE_REFRESH_QUERY_PARAM, token);
    return shell.toString();
  }
  const page = new URL(url.toString());
  page.hash = '';
  return page.toString();
}

/**
 * Pages pretty-URLs 308 `/guide/collaborate` to `/guide/collaborate/`.
 * Chrome fails a navigation with ERR_FAILED when a service worker responds
 * with that redirected response, so copy the final body into a new response.
 */
export async function navigationBody(response: Response): Promise<Response> {
  if (!response.redirected) return response;
  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  return new Response(await response.arrayBuffer(), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function refreshFallbackDocument(url: URL): Response {
  const path = pathWithoutRefreshParam({
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  });
  const target = path.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${target}"></head><body></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/** Fetch the fresh document. Never reject: a thrown fetch becomes ERR_FAILED. */
export async function freshNavigationResponse(
  url: URL,
  fetchImpl: (input: string, init: RequestInit) => Promise<Response>,
  matchCachedShell: () => Promise<Response | undefined>
): Promise<Response> {
  try {
    const response = await fetchImpl(refreshNetworkUrl(url), {
      cache: 'reload',
      redirect: 'follow',
      headers: { Accept: 'text/html' },
    });
    if (response.ok) return await navigationBody(response);
  } catch {
    // Network failed, or the redirected body could not be copied.
  }
  try {
    const cached = await matchCachedShell();
    if (cached) return cached;
  } catch {
    // Cache Storage can be missing after Refresh clears it.
  }
  return refreshFallbackDocument(url);
}

export type ControllerChangeSource = {
  addEventListener(type: 'controllerchange', listener: () => void): void;
  removeEventListener(type: 'controllerchange', listener: () => void): void;
};

/** Resolves true when a waiting worker takes control, false when `timeoutMs` elapses. */
export function waitForControllerChange(
  source: ControllerChangeSource,
  timeoutMs: number,
  schedule: (ms: number, fire: () => void) => () => void = (ms, fire) => {
    const id = setTimeout(fire, ms);
    return () => clearTimeout(id);
  }
): Promise<boolean> {
  return new Promise(resolve => {
    let settled = false;
    let cancel = () => {};
    const finish = (changed: boolean) => {
      if (settled) return;
      settled = true;
      cancel();
      source.removeEventListener('controllerchange', onChange);
      resolve(changed);
    };
    const onChange = () => finish(true);
    source.addEventListener('controllerchange', onChange);
    cancel = schedule(timeoutMs, () => finish(false));
  });
}

/** Drop the cache-bust param after a refresh so the next deploy can wait for a click. */
export function pathWithoutRefreshParam(
  location: Pick<Location, 'pathname' | 'search' | 'hash'>
): string {
  const url = new URL(
    `${location.pathname}${location.search}${location.hash}`,
    'https://archlens.invalid'
  );
  url.searchParams.delete(UPDATE_REFRESH_QUERY_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Drop a wedged controller so the next load is not served from a stale app shell. */
export async function reloadWithoutServiceWorker({
  getRegistrations,
  cacheKeys,
  deleteCache,
  reload,
  skipWaiting,
  deadlineMs = SERVICE_WORKER_RELOAD_DEADLINE_MS,
}: ServiceWorkerReload): Promise<void> {
  const cleanup = (async () => {
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
  })();

  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<void>(resolve => {
    timer = setTimeout(resolve, deadlineMs);
  });
  await Promise.race([cleanup.finally(() => clearTimeout(timer)), deadline]);
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
