export type ObjectStorageProvider = 'r2' | 's3' | 'azure' | 'http';

export type ObjectStoragePutRequest = {
  /** Object key relative to the storage root (bucket/container/base URL). */
  key: string;
  body: string | Uint8Array;
  contentType?: string;
};

export type PutObjectsOptions = {
  concurrency?: number;
  /** Keys uploaded only after all other objects succeed (e.g. `latest/manifest.json`). */
  writeLastKeys?: readonly string[];
};

/**
 * Outbound port for object storage — read/write blobs by key.
 * Concrete adapters: S3-compatible (R2, AWS S3), Azure Blob, HTTP (read-only CDN).
 */
export interface ObjectStoragePort {
  readonly provider: ObjectStorageProvider;
  getObject(key: string): Promise<Uint8Array>;
  getObjectText(key: string): Promise<string>;
  putObject(request: ObjectStoragePutRequest): Promise<void>;
}
