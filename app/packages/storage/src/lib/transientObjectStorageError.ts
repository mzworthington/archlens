/**
 * Heuristic for retryable object-storage failures (R2/S3 5xx, throttling, timeouts).
 * Precondition / CAS failures are never transient.
 */
export function isTransientObjectStorageError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as {
    name?: string;
    Code?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number };
  };
  const status = record.$metadata?.httpStatusCode;
  if (status === 412) return false;
  if (
    record.name === 'PreconditionFailed' ||
    record.name === '412' ||
    record.name === 'ObjectStoragePreconditionFailedError'
  ) {
    return false;
  }
  if (status === 429 || (typeof status === 'number' && status >= 500)) return true;
  const code = record.name ?? record.Code ?? '';
  if (
    /^(InternalError|SlowDown|ServiceUnavailable|RequestTimeout|TimeoutError|NetworkingError|TooManyRequestsException)$/i.test(
      code
    )
  ) {
    return true;
  }
  const message = record.message ?? '';
  return /internal error|service unavailable|timed out|ECONNRESET|ETIMEDOUT|socket hang up/i.test(
    message
  );
}
