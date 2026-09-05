export function requestServiceWorkerUpdate(
  registration: Pick<ServiceWorkerRegistration, 'update'> | undefined
): Promise<void> {
  if (!registration) return Promise.resolve();
  return registration
    .update()
    .then(() => undefined)
    .catch((error: unknown) => {
      if (isAbortError(error)) return;
      throw error;
    });
}

function isAbortError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if (!('name' in error)) return false;
  return error.name === 'AbortError';
}
