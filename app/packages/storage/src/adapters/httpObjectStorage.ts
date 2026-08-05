import { joinPublicBaseUrl, normalizePublicBaseUrl } from '../lib/objectKey';
import type { HttpObjectStorageConfig } from '../config/objectStorageConfig';
import type {
  ObjectStorageObjectMeta,
  ObjectStoragePort,
  ObjectStoragePutRequest,
} from '../ports/objectStoragePort';

const FETCH_ATTEMPTS = 3;

function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /failed to fetch|networkerror|load failed|network request failed/i.test(error.message);
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBytes(
  url: string,
  fetchImpl: typeof fetch,
  attempts = FETCH_ATTEMPTS
): Promise<{ body: Uint8Array; etag?: string }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url);
      if (response.ok) {
        const etag = response.headers.get('etag')?.replaceAll('"', '') ?? undefined;
        return { body: new Uint8Array(await response.arrayBuffer()), etag };
      }
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(`HTTP ${response.status} for ${url}`);
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

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Failed to fetch object storage (${message})`);
}

/**
 * Read-only object storage over HTTPS (public CDN / custom domain).
 * Used by Canvas for remote blueprint catalogs without bundling cloud SDKs.
 */
export function createHttpObjectStorage(config: HttpObjectStorageConfig): ObjectStoragePort {
  const baseUrl = normalizePublicBaseUrl(config.baseUrl);
  const fetchImpl = config.fetchImpl ?? fetch;

  return {
    provider: 'http',
    async getObject(key: string): Promise<Uint8Array> {
      return (await this.getObjectWithMeta(key)).body;
    },
    async getObjectText(key: string): Promise<string> {
      const bytes = await this.getObject(key);
      return new TextDecoder().decode(bytes);
    },
    async getObjectWithMeta(key: string): Promise<ObjectStorageObjectMeta> {
      return fetchBytes(joinPublicBaseUrl(baseUrl, key), fetchImpl);
    },
    async listObjectKeys(_prefix: string): Promise<string[]> {
      throw new Error('HTTP object storage does not support listing');
    },
    async putObject(_request: ObjectStoragePutRequest): Promise<void> {
      throw new Error('HTTP object storage is read-only');
    },
    async deleteObject(_key: string): Promise<void> {
      throw new Error('HTTP object storage is read-only');
    },
  };
}
