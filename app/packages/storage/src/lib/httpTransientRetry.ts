/**
 * Browser/CDN fetch retry budget for remote catalog consume.
 * Longer than the old 3×50ms loop so a burst of R2/CDN 500s can still succeed,
 * but capped below the R2 SDK outer send backoff (which may wait ~30s).
 */
export const HTTP_TRANSIENT_FETCH_ATTEMPTS = 8;

/** Exposed for unit tests. Attempt is 1-based after a failure. */
export function httpTransientBackoffMs(failedAttempts: number): number {
  return Math.min(2000, 100 * 2 ** Math.max(0, failedAttempts - 1));
}

export function defaultSleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
