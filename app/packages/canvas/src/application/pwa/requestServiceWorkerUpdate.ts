/**
 * Ask the service worker to check for a new build.
 *
 * Chrome rejects `update()` with an `AbortError` when it cancels the update
 * job, usually because the page is going away. That rejection is expected and
 * the next visible-tab check retries, so this swallows it. Any other rejection
 * is a genuine failure and still propagates, so error tracking keeps it.
 */
export function requestServiceWorkerUpdate(
  registration: Pick<ServiceWorkerRegistration, 'update'> | undefined
): Promise<void> {
  if (!registration) return Promise.resolve();
  return registration.update().catch((error: unknown) => {
    if (isAbortError(error)) return;
    throw error;
  });
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}
