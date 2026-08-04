import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob';
import type { AzureBlobStorageConfig } from '../config/objectStorageConfig';
import { joinObjectKey, normalizeObjectKeyPrefix } from '../lib/objectKey';
import type {
  ObjectStorageObjectMeta,
  ObjectStoragePort,
  ObjectStoragePutRequest,
} from '../ports/objectStoragePort';
import { ObjectStoragePreconditionFailedError } from '../ports/objectStoragePort';

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

function isAzurePreconditionFailed(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const statusCode = (error as { statusCode?: number }).statusCode;
  return statusCode === 412;
}

export function createAzureBlobObjectStorage(config: AzureBlobStorageConfig): ObjectStoragePort {
  const container = resolveContainerClient(config);
  const prefix = normalizeObjectKeyPrefix(config.keyPrefix);

  return {
    provider: 'azure',
    async getObject(key: string): Promise<Uint8Array> {
      return (await this.getObjectWithMeta(key)).body;
    },
    async getObjectText(key: string): Promise<string> {
      const bytes = await this.getObject(key);
      return new TextDecoder().decode(bytes);
    },
    async getObjectWithMeta(key: string): Promise<ObjectStorageObjectMeta> {
      const blob = container.getBlockBlobClient(joinObjectKey(prefix, key));
      const properties = await blob.getProperties();
      const buffer = await blob.downloadToBuffer();
      return {
        body: new Uint8Array(buffer),
        etag: properties.etag?.replaceAll('"', ''),
      };
    },
    async listObjectKeys(listPrefix: string): Promise<string[]> {
      const fullPrefix = joinObjectKey(prefix, listPrefix);
      const keys: string[] = [];
      for await (const item of container.listBlobsFlat({ prefix: fullPrefix })) {
        const name = item.name;
        if (prefix) {
          const withSlash = `${prefix.replace(/\/+$/, '')}/`;
          keys.push(name.startsWith(withSlash) ? name.slice(withSlash.length) : name);
        } else {
          keys.push(name);
        }
      }
      return keys.sort((a, b) => a.localeCompare(b));
    },
    async putObject(request: ObjectStoragePutRequest): Promise<void> {
      const blob = container.getBlockBlobClient(joinObjectKey(prefix, request.key));
      const bytes = toBodyBytes(request.body);
      const conditions: { ifMatch?: string; ifNoneMatch?: string } = {};
      if (request.ifMatch) conditions.ifMatch = request.ifMatch;
      if (request.ifNoneMatch) conditions.ifNoneMatch = request.ifNoneMatch;
      try {
        await blob.uploadData(bytes, {
          blobHTTPHeaders: request.contentType
            ? { blobContentType: request.contentType }
            : undefined,
          conditions: Object.keys(conditions).length > 0 ? conditions : undefined,
        });
      } catch (error) {
        if (isAzurePreconditionFailed(error)) {
          throw new ObjectStoragePreconditionFailedError(request.key);
        }
        throw error;
      }
    },
  };
}
