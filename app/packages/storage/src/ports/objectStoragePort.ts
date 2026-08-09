export type ObjectStorageProvider = 'r2' | 's3' | 'azure' | 'http';

export type ObjectStoragePutRequest = {
  /** Object key relative to the storage root (bucket/container/base URL). */
  key: string;
  body: string | Uint8Array;
  contentType?: string;
  /**
   * Compare-and-swap: succeed only when the live object ETag matches.
   * Use after reading `getObjectWithMeta`.
   */
  ifMatch?: string;
  /**
   * Create-only when set to `*`: succeed only when the object does not exist.
   */
  ifNoneMatch?: string;
};

export type ObjectStorageObjectMeta = {
  body: Uint8Array;
  /** Opaque ETag from the provider (quotes stripped when present). */
  etag?: string;
};

export type PutObjectsOptions = {
  concurrency?: number;
  /** Keys uploaded only after all other objects succeed (e.g. `latest/manifest.json`). */
  writeLastKeys?: readonly string[];
};

/**
 * Thrown when a conditional `putObject` fails (HTTP 412 / Azure precondition).
 */
export class ObjectStoragePreconditionFailedError extends Error {
  readonly key: string;

  constructor(key: string, message?: string) {
    super(message ?? `Object storage precondition failed for key: ${key}`);
    this.name = 'ObjectStoragePreconditionFailedError';
    this.key = key;
  }
}

/**
 * Outbound port for object storage - read/write blobs by key.
 * Concrete adapters: S3-compatible (R2, AWS S3), Azure Blob, HTTP (read-only CDN).
 */
export interface ObjectStoragePort {
  readonly provider: ObjectStorageProvider;
  getObject(key: string): Promise<Uint8Array>;
  getObjectText(key: string): Promise<string>;
  /**
   * Read body + ETag for compare-and-swap. Adapters that cannot supply an ETag
   * still return the body; callers must treat missing etag as non-CAS.
   */
  getObjectWithMeta(key: string): Promise<ObjectStorageObjectMeta>;
  /**
   * List object keys under a prefix (relative to the storage root / keyPrefix).
   * Keys are returned relative to the storage root (same space as get/put).
   */
  listObjectKeys(prefix: string): Promise<string[]>;
  putObject(request: ObjectStoragePutRequest): Promise<void>;
  /** Delete a single object by key (relative to storage root / keyPrefix). */
  deleteObject(key: string): Promise<void>;
}
