import type { ObjectStorageConfig } from './config/objectStorageConfig';
import { createAzureBlobObjectStorage } from './adapters/azureBlobObjectStorage';
import { createHttpObjectStorage } from './adapters/httpObjectStorage';
import { createS3ObjectStorage } from './adapters/s3ObjectStorage';
import type { ObjectStoragePort } from './ports/objectStoragePort';

export function createObjectStorage(config: ObjectStorageConfig): ObjectStoragePort {
  switch (config.provider) {
    case 'r2':
    case 's3':
      return createS3ObjectStorage(config);
    case 'azure':
      return createAzureBlobObjectStorage(config);
    case 'http':
      return createHttpObjectStorage(config);
    default: {
      const exhaustive: never = config;
      throw new Error(
        `Unsupported object storage provider: ${(exhaustive as ObjectStorageConfig).provider}`
      );
    }
  }
}
