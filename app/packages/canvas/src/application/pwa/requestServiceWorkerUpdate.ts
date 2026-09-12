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

function isBenignServiceWorkerUpdateFailure(error: unknown): boolean {
  if (isNamedError(error, 'AbortError')) return true;
  if (!(error instanceof TypeError)) return false;
  return /Failed to fetch|Load failed|fetching the script|ServiceWorker/i.test(error.message);
}

function isNamedError(error: unknown, name: string): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if (!('name' in error)) return false;
  return error.name === name;
}
