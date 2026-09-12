import { isBenignServiceWorkerUpdateFailure } from './benignServiceWorkerUpdateFailure';

export type ServiceWorkerReload = {
  getRegistrations: () => Promise<ReadonlyArray<{ unregister: () => Promise<boolean> }>>;
  reload: () => void;
};

/** Drop a wedged controller so the next load is not served from a stale app shell. */
export async function reloadWithoutServiceWorker({
  getRegistrations,
  reload,
}: ServiceWorkerReload): Promise<void> {
  const registrations = await getRegistrations();
  await Promise.all(registrations.map(registration => registration.unregister()));
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
