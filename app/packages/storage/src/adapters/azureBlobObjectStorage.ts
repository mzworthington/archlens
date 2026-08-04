import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob';
import type { AzureBlobStorageConfig } from '../config/objectStorageConfig';
import { joinObjectKey, normalizeObjectKeyPrefix } from '../lib/objectKey';
import type { ObjectStoragePort, ObjectStoragePutRequest } from '../ports/objectStoragePort';

function toBodyBytes(body: string | Uint8Array): Uint8Array {
  return typeof body === 'string' ? new TextEncoder().encode(body) : body;
}

function resolveContainerClient(config: AzureBlobStorageConfig): ContainerClient {
  if (config.connectionString) {
    return BlobServiceClient.fromConnectionString(config.connectionString).getContainerClient(
      config.container
    );
  }
  if (config.accountUrl && config.sasToken) {
    return new BlobServiceClient(`${config.accountUrl}?${config.sasToken}`).getContainerClient(
      config.container
    );
  }
  throw new Error(
    'Azure blob storage requires AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_URL + AZURE_STORAGE_SAS_TOKEN'
  );
}

export function createAzureBlobObjectStorage(config: AzureBlobStorageConfig): ObjectStoragePort {
  const container = resolveContainerClient(config);
  const prefix = normalizeObjectKeyPrefix(config.keyPrefix);

  return {
    provider: 'azure',
    async getObject(key: string): Promise<Uint8Array> {
      const blob = container.getBlockBlobClient(joinObjectKey(prefix, key));
      const buffer = await blob.downloadToBuffer();
      return new Uint8Array(buffer);
    },
    async getObjectText(key: string): Promise<string> {
      const blob = container.getBlockBlobClient(joinObjectKey(prefix, key));
      return blob.downloadToBuffer().then(buffer => buffer.toString('utf8'));
    },
    async putObject(request: ObjectStoragePutRequest): Promise<void> {
      const blob = container.getBlockBlobClient(joinObjectKey(prefix, request.key));
      const bytes = toBodyBytes(request.body);
      await blob.uploadData(bytes, {
        blobHTTPHeaders: request.contentType ? { blobContentType: request.contentType } : undefined,
      });
    },
  };
}
