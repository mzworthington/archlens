export function isBenignServiceWorkerUpdateFailure(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const name = 'name' in error && typeof error.name === 'string' ? error.name : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  if (name === 'AbortError' || name === 'NetworkError') return true;
  if (name === 'TypeError' && /^(Failed to fetch|Load failed)$/i.test(message)) return true;
  return isBenignServiceWorkerUpdateFailureMessage(message);
}

export function isBenignServiceWorkerUpdateFailureMessage(message: string): boolean {
  return (
    /Failed to update a ServiceWorker/i.test(message) ||
    /ServiceWorker script at .+ encountered an error during installation/i.test(message) ||
    /an unknown error occurred when fetching the script/i.test(message)
  );
}
