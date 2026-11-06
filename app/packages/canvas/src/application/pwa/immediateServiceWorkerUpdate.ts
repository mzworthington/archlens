import { UPDATE_REFRESH_QUERY_PARAM } from './requestServiceWorkerUpdate';

/** A page already caught in Refresh carries this param. The new worker should take over. */
export function clientRequestedImmediateUpdate(clientUrls: readonly string[]): boolean {
  return clientUrls.some(url => {
    try {
      return new URL(url).searchParams.has(UPDATE_REFRESH_QUERY_PARAM);
    } catch {
      return false;
    }
  });
}

/** Workbox posts this when the user accepts the update prompt. */
export function isSkipWaitingMessage(data: unknown): boolean {
  if (typeof data !== 'object' || data === null || !('type' in data)) return false;
  return data.type === 'SKIP_WAITING';
}

/** Only the app's own pages may ask the worker to take over. */
export function acceptsServiceWorkerUpdateMessage(
  origin: string,
  pageOrigin: string,
  data: unknown
): boolean {
  return origin === pageOrigin && isSkipWaitingMessage(data);
}
