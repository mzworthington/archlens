import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import type { S3CompatibleStorageConfig } from '../config/objectStorageConfig';
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

function normalizeEtag(etag: string | undefined): string | undefined {
  if (!etag) return undefined;
  return etag.replaceAll('"', '');
}

async function streamToBytes(body: unknown): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  if (body instanceof Uint8Array) return body;
  if (typeof body === 'string') return new TextEncoder().encode(body);
  if (
    typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray ===
    'function'
  ) {
    return (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
  }
  const chunks: Uint8Array[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function isPreconditionFailed(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    record.name === 'PreconditionFailed' ||
    record.name === '412' ||
    record.$metadata?.httpStatusCode === 412
  );
}

export type S3ObjectStorageDeps = {
  send?: S3Client['send'];
};

export function createS3ObjectStorage(
  config: S3CompatibleStorageConfig,
  deps: S3ObjectStorageDeps = {}
): ObjectStoragePort {
  const clientConfig: S3ClientConfig = {
    region: config.region ?? (config.provider === 'r2' ? 'auto' : 'us-east-1'),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  };
  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
  }

  const client = new S3Client(clientConfig);
  const send = deps.send ?? client.send.bind(client);
  const prefix = normalizeObjectKeyPrefix(config.keyPrefix);

  const resolveKey = (key: string): string => joinObjectKey(prefix, key);

  const stripPrefix = (fullKey: string): string => {
    if (!prefix) return fullKey;
    const withSlash = `${prefix}/`;
    return fullKey.startsWith(withSlash) ? fullKey.slice(withSlash.length) : fullKey;
  };

  return {
    provider: config.provider,
    async getObject(key: string): Promise<Uint8Array> {
      return (await this.getObjectWithMeta(key)).body;
    },
    async getObjectText(key: string): Promise<string> {
      const bytes = await this.getObject(key);
      return new TextDecoder().decode(bytes);
    },
    async getObjectWithMeta(key: string): Promise<ObjectStorageObjectMeta> {
      const response = await send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: resolveKey(key),
        })
      );
      return {
        body: await streamToBytes(response.Body),
        etag: normalizeEtag(response.ETag),
      };
    },
    async listObjectKeys(listPrefix: string): Promise<string[]> {
      const fullPrefix = resolveKey(listPrefix);
      const keys: string[] = [];
      let continuationToken: string | undefined;
      do {
        const response = await send(
          new ListObjectsV2Command({
            Bucket: config.bucket,
            Prefix: fullPrefix,
            ContinuationToken: continuationToken,
          })
        );
        for (const item of response.Contents ?? []) {
          if (item.Key) keys.push(stripPrefix(item.Key));
        }
        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
      } while (continuationToken);
      return keys.sort((a, b) => a.localeCompare(b));
    },
    async putObject(request: ObjectStoragePutRequest): Promise<void> {
      try {
        await send(
          new PutObjectCommand({
            Bucket: config.bucket,
            Key: resolveKey(request.key),
            Body: toBodyBytes(request.body),
            ContentType: request.contentType,
            ...(request.ifMatch ? { IfMatch: request.ifMatch } : {}),
            ...(request.ifNoneMatch ? { IfNoneMatch: request.ifNoneMatch } : {}),
          })
        );
      } catch (error) {
        if (isPreconditionFailed(error)) {
          throw new ObjectStoragePreconditionFailedError(request.key);
        }
        throw error;
      }
    },
    async deleteObject(key: string): Promise<void> {
      await send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: resolveKey(key),
        })
      );
    },
  };
}
