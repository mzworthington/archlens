import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import type { S3CompatibleStorageConfig } from '../config/objectStorageConfig';
import type { ObjectStoragePort, ObjectStoragePutRequest } from '../ports/objectStoragePort';

function toBodyBytes(body: string | Uint8Array): Uint8Array {
  return typeof body === 'string' ? new TextEncoder().encode(body) : body;
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
  const prefix = config.keyPrefix ?? '';

  const resolveKey = (key: string): string => {
    const normalized = key.replace(/^\/+/, '');
    if (!prefix) return normalized;
    return `${prefix.replace(/^\/+|\/+$/g, '')}/${normalized}`;
  };

  return {
    provider: config.provider,
    async getObject(key: string): Promise<Uint8Array> {
      const response = await send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: resolveKey(key),
        })
      );
      return streamToBytes(response.Body);
    },
    async getObjectText(key: string): Promise<string> {
      const bytes = await this.getObject(key);
      return new TextDecoder().decode(bytes);
    },
    async putObject(request: ObjectStoragePutRequest): Promise<void> {
      await send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: resolveKey(request.key),
          Body: toBodyBytes(request.body),
          ContentType: request.contentType,
        })
      );
    },
  };
}
