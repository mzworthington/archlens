import { isBenignServiceWorkerUpdateFailure } from './benignServiceWorkerUpdateFailure';

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
