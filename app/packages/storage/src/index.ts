export type {
  ObjectStoragePort,
  ObjectStorageProvider,
  ObjectStoragePutRequest,
  PutObjectsOptions,
} from './ports/objectStoragePort';

export type {
  AzureBlobStorageConfig,
  HttpObjectStorageConfig,
  ObjectStorageConfig,
  S3CompatibleStorageConfig,
} from './config/objectStorageConfig';
export { isWritableStorageProvider } from './config/objectStorageConfig';
export { resolveObjectStorageConfigFromEnv } from './config/resolveObjectStorageFromEnv';

export { createObjectStorage } from './createObjectStorage';
export { createS3ObjectStorage } from './adapters/s3ObjectStorage';
export { createAzureBlobObjectStorage } from './adapters/azureBlobObjectStorage';
export { createHttpObjectStorage } from './adapters/httpObjectStorage';

export {
  joinObjectKey,
  joinPublicBaseUrl,
  normalizeObjectKeyPrefix,
  normalizePublicBaseUrl,
} from './lib/objectKey';
export { uploadObjects, type UploadObjectsResult } from './lib/uploadObjects';
export {
  uploadRemoteCatalogSnapshot,
  type CatalogSnapshotUploadResult,
} from './catalog/uploadRemoteCatalogSnapshot';
export { InMemoryObjectStorage } from './testing/inMemoryObjectStorage';
