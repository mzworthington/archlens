import { describe, it, expect } from 'vitest';
import { CancellationError, isCancellationError, throwIfAborted } from './cancellation.ts';

describe('cancellation', () => {
  it('throwIfAborted no-ops without a signal or when not aborted', () => {
    expect(() => throwIfAborted()).not.toThrow();
    expect(() => throwIfAborted(new AbortController().signal)).not.toThrow();
  });

  it('throwIfAborted throws CancellationError when aborted', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => throwIfAborted(controller.signal)).toThrow(CancellationError);
  });

  it('identifies cancellation errors', () => {
    expect(isCancellationError(new CancellationError())).toBe(true);
    expect(isCancellationError(new Error('nope'))).toBe(false);
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    expect(isCancellationError(abortErr)).toBe(true);
  });
});
