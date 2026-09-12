import { describe, expect, it, vi } from 'vitest';
import { requestServiceWorkerUpdate } from './requestServiceWorkerUpdate';

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

  it('propagates a genuine update failure', async () => {
    const failure = new DOMException('Permission denied', 'SecurityError');
    const update = vi.fn().mockRejectedValue(failure);
    await expect(requestServiceWorkerUpdate({ update })).rejects.toBe(failure);
  });
});
