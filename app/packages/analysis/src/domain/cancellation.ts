/**
 * Cooperative cancellation via AbortSignal.
 * CLI SIGINT wiring lives in `@archlens/cli` (`createCliCancellation`).
 */

export class CancellationError extends Error {
  readonly name = 'CancellationError';

  constructor(message = 'Analysis cancelled.') {
    super(message);
  }
}

export function isCancellationError(error: unknown): boolean {
  return (
    error instanceof CancellationError ||
    (error instanceof Error && error.name === 'CancellationError') ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name: string }).name === 'AbortError')
  );
}

export function throwIfAborted(signal?: AbortSignal, message?: string): void {
  if (!signal) return;
  if (signal.aborted) {
    throw new CancellationError(message);
  }
}
