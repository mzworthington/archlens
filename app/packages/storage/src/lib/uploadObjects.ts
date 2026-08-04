import type {
  ObjectStoragePort,
  ObjectStoragePutRequest,
  PutObjectsOptions,
} from '../ports/objectStoragePort';
import { joinObjectKey, normalizeObjectKeyPrefix } from './objectKey';

const DEFAULT_CONCURRENCY = 16;

async function mapPool<T>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await mapper(items[index]!);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

export type UploadObjectsResult = {
  uploadedObjects: number;
};

/**
 * Upload objects through an `ObjectStoragePort`, optionally deferring pointer keys
 * until all snapshot objects are written (ADR-0010 atomic cutover).
 */
export async function uploadObjects(
  storage: ObjectStoragePort,
  objects: readonly ObjectStoragePutRequest[],
  options: PutObjectsOptions & { keyPrefix?: string } = {}
): Promise<UploadObjectsResult> {
  const prefix = normalizeObjectKeyPrefix(options.keyPrefix);
  const writeLast = new Set(options.writeLastKeys ?? []);
  const snapshotObjects = objects.filter(object => !writeLast.has(object.key));
  const deferredObjects = objects.filter(object => writeLast.has(object.key));

  const put = async (object: ObjectStoragePutRequest): Promise<void> => {
    await storage.putObject({
      ...object,
      key: joinObjectKey(prefix, object.key),
    });
  };

  await mapPool(snapshotObjects, options.concurrency ?? DEFAULT_CONCURRENCY, put);
  for (const object of deferredObjects) {
    await put(object);
  }

  return { uploadedObjects: objects.length };
}
