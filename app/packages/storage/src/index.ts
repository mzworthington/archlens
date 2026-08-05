export type {
  ObjectStorageObjectMeta,
  ObjectStoragePort,
  ObjectStorageProvider,
  ObjectStoragePutRequest,
  PutObjectsOptions,
} from './ports/objectStoragePort';
export { ObjectStoragePreconditionFailedError } from './ports/objectStoragePort';

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
  type UploadRemoteCatalogSnapshotOptions,
} from './catalog/uploadRemoteCatalogSnapshot';
export {
  loadEstateFragmentsFromStorage,
  uploadEstateFragment,
  type UploadEstateFragmentResult,
} from './catalog/estateFragmentStorage';
export {
  planAndOptionallyPruneRemoteCatalog,
  type PruneRemoteCatalogOptions,
  type PruneRemoteCatalogResult,
} from './catalog/pruneRemoteCatalog';
export {
  loadSuggestionOverlaysFromStorage,
  rejectSuggestionOverlayInStorage,
  uploadSuggestionOverlay,
  type UploadSuggestionOverlayResult,
} from './catalog/suggestionOverlayStorage';
export { InMemoryObjectStorage } from './testing/inMemoryObjectStorage';
