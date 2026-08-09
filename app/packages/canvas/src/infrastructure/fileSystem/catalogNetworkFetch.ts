export const CATALOG_BLUEPRINT_FETCH_CONCURRENCY = 24;
export const CATALOG_PRELOAD_FETCH_CONCURRENCY = 4;
const FETCH_ATTEMPTS = 3;

function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /failed to fetch|networkerror|load failed|network request failed/i.test(error.message);
}

export function catalogFetchError(error: unknown, context: string): Error {
  if (error instanceof Error && isTransientNetworkError(error)) {
    return new Error(
      `Failed to fetch blueprint catalog (${error.message}). ${context} Check your network connection and retry.`
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchResponseWithRetry(
  url: string,
  attempts = FETCH_ATTEMPTS,
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url);
      if (
        response.ok ||
        (response.status >= 400 && response.status < 500 && response.status !== 429)
      ) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    const retryable =
      isTransientNetworkError(lastError) ||
      /HTTP (429|5\d\d)/.test(String(lastError instanceof Error ? lastError.message : lastError));
    if (!retryable || attempt === attempts) break;
    await sleep(50 * attempt);
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]!);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
