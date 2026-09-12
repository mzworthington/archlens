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

  it('swallows TypeError when the browser cannot fetch sw.js', async () => {
    const update = vi
      .fn()
      .mockRejectedValue(
        new TypeError(
          "Failed to update a ServiceWorker for scope ('https://archlens.dev/') with script ('https://archlens.dev/sw.js'): An unknown error occurred when fetching the script."
        )
      );
    await expect(requestServiceWorkerUpdate({ update })).resolves.toBeUndefined();
  });

  it('swallows a transient Failed to fetch TypeError on the update request', async () => {
    const update = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(requestServiceWorkerUpdate({ update })).resolves.toBeUndefined();
  });

  it('propagates a genuine update failure', async () => {
    const failure = new DOMException('boom', 'NetworkError');
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
