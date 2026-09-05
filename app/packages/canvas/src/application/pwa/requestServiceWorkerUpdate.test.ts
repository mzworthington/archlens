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

  it('propagates a genuine update failure', async () => {
    const failure = new DOMException('boom', 'NetworkError');
    const update = vi.fn().mockRejectedValue(failure);
    await expect(requestServiceWorkerUpdate({ update })).rejects.toBe(failure);
  });
});
