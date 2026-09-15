import { describe, expect, it, vi } from 'vitest';
import {
  cacheBustingReloadPath,
  cacheBustingReloadUrl,
  reloadWithoutServiceWorker,
  requestServiceWorkerUpdate,
} from './requestServiceWorkerUpdate';

describe('requestServiceWorkerUpdate', () => {
  it('resolves without calling update when there is no registration', async () => {
    await expect(requestServiceWorkerUpdate(undefined)).resolves.toBeUndefined();
  });

  it('asks the registration to check for an update', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    await requestServiceWorkerUpdate({ update });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('swallows the AbortError Chrome raises when it cancels the update', async () => {
    const update = vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError'));
    await expect(requestServiceWorkerUpdate({ update })).resolves.toBeUndefined();
  });

  it('swallows a TypeError when the browser cannot fetch sw.js', async () => {
    const failure = new TypeError(
      "Failed to update a ServiceWorker for scope ('https://archlens.dev/') with script ('https://archlens.dev/sw.js'): An unknown error occurred when fetching the script."
    );
    const update = vi.fn().mockRejectedValue(failure);
    await expect(requestServiceWorkerUpdate({ update })).resolves.toBeUndefined();
  });

  it('swallows a TypeError when service worker installation fails', async () => {
    const failure = new TypeError(
      'ServiceWorker script at https://archlens.dev/sw.js for scope https://archlens.dev/ encountered an error during installation.'
    );
    const update = vi.fn().mockRejectedValue(failure);
    await expect(requestServiceWorkerUpdate({ update })).resolves.toBeUndefined();
  });

  it('swallows a NetworkError from a transient update fetch', async () => {
    const failure = new DOMException('Failed to fetch', 'NetworkError');
    const update = vi.fn().mockRejectedValue(failure);
    await expect(requestServiceWorkerUpdate({ update })).resolves.toBeUndefined();
  });

  it('swallows a Failed to fetch TypeError on the update request', async () => {
    const update = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(requestServiceWorkerUpdate({ update })).resolves.toBeUndefined();
  });

  it('propagates a genuine update failure', async () => {
    const failure = new DOMException('Permission denied', 'SecurityError');
    const update = vi.fn().mockRejectedValue(failure);
    await expect(requestServiceWorkerUpdate({ update })).rejects.toBe(failure);
  });

  it('propagates a TypeError that is not a script-fetch failure', async () => {
    const failure = new TypeError('unexpected');
    const update = vi.fn().mockRejectedValue(failure);
    await expect(requestServiceWorkerUpdate({ update })).rejects.toBe(failure);
  });

  it('propagates a Chrome ServiceWorker TypeError that is not a fetch failure', async () => {
    const failure = new TypeError(
      "Failed to update a ServiceWorker for scope ('https://archlens.dev/') with script ('https://archlens.dev/sw.js'): The script has an unsupported MIME type ('text/html')."
    );
    const update = vi.fn().mockRejectedValue(failure);
    await expect(requestServiceWorkerUpdate({ update })).rejects.toBe(failure);
  });
});

describe('cacheBustingReloadUrl', () => {
  it('adds a unique query param so the next navigation is not a cached shell', () => {
    expect(cacheBustingReloadUrl('https://archlens.dev/', 1700000000000)).toBe(
      'https://archlens.dev/?al_refresh=1700000000000'
    );
  });
});

describe('cacheBustingReloadPath', () => {
  it('returns a same-origin relative path so location.replace cannot open-redirect', () => {
    expect(
      cacheBustingReloadPath(
        { pathname: '/workspace', search: '?room=abc', hash: '#x' },
        1700000000000
      )
    ).toBe('/workspace?room=abc&al_refresh=1700000000000#x');
  });
});

describe('reloadWithoutServiceWorker', () => {
  it('unregisters every worker then reloads so the next document is not a stale shell', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const reload = vi.fn();
    await reloadWithoutServiceWorker({
      getRegistrations: async () => [{ unregister }],
      reload,
    });
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('clears Cache Storage before reload so a controlling worker cannot serve the old shell', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const deleteCache = vi.fn().mockResolvedValue(true);
    const reload = vi.fn();
    await reloadWithoutServiceWorker({
      getRegistrations: async () => [{ unregister }],
      cacheKeys: async () => ['workbox-precache-v2-https://archlens.dev/'],
      deleteCache,
      reload,
    });
    expect(deleteCache).toHaveBeenCalledWith('workbox-precache-v2-https://archlens.dev/');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('still reloads when skipWaiting throws because the waiting worker never installed', async () => {
    const reload = vi.fn();
    await reloadWithoutServiceWorker({
      skipWaiting: () => {
        throw new TypeError(
          'ServiceWorker script at https://archlens.dev/sw.js for scope https://archlens.dev/ encountered an error during installation.'
        );
      },
      getRegistrations: async () => [],
      reload,
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('still reloads when unregister rejects', async () => {
    const reload = vi.fn();
    await reloadWithoutServiceWorker({
      getRegistrations: async () => [
        { unregister: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) },
      ],
      reload,
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('still reloads when listing registrations throws', async () => {
    const reload = vi.fn();
    await reloadWithoutServiceWorker({
      getRegistrations: async () => {
        throw new TypeError('navigator.serviceWorker is undefined');
      },
      reload,
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
