import { describe, expect, it, vi } from 'vitest';
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { createS3ObjectStorage } from './s3ObjectStorage';
import { ObjectStoragePreconditionFailedError } from '../ports/objectStoragePort';
import { InMemoryObjectStorage } from '../testing/inMemoryObjectStorage';

describe('Feature: S3-compatible object storage (R2 and AWS)', () => {
  it('stores and retrieves objects through the S3 API', async () => {
    const send = vi.fn(async command => {
      if (command instanceof PutObjectCommand) return {};
      if (command instanceof GetObjectCommand) {
        return { Body: new TextEncoder().encode('diagram-yaml'), ETag: '"abc"' };
      }
      throw new Error('unexpected command');
    });

    const storage = createS3ObjectStorage(
      {
        provider: 'r2',
        bucket: 'catalog',
        accessKeyId: 'key',
        secretAccessKey: 'secret',
        endpoint: 'https://account.r2.cloudflarestorage.com',
      },
      { send }
    );

    await storage.putObject({
      key: 'snapshots/rev1/demo/context.yaml',
      body: 'yaml',
      contentType: 'application/yaml',
    });
    await expect(storage.getObjectText('snapshots/rev1/demo/context.yaml')).resolves.toBe(
      'diagram-yaml'
    );
    await expect(storage.getObjectWithMeta('snapshots/rev1/demo/context.yaml')).resolves.toEqual({
      body: expect.any(Uint8Array),
      etag: 'abc',
    });
  });

  it('honours a configured key prefix inside the bucket', async () => {
    const send = vi.fn(async command => {
      if (command instanceof PutObjectCommand) {
        expect(command.input.Key).toBe('tenant-a/snapshots/rev1/catalog.json');
        return {};
      }
      throw new Error('unexpected command');
    });

    const storage = createS3ObjectStorage(
      {
        provider: 's3',
        bucket: 'catalog',
        accessKeyId: 'key',
        secretAccessKey: 'secret',
        keyPrefix: 'tenant-a',
      },
      { send }
    );

    await storage.putObject({ key: 'snapshots/rev1/catalog.json', body: '[]' });
  });

  it('lists keys under a prefix and strips the configured bucket prefix', async () => {
    const send = vi.fn(async command => {
      if (command instanceof ListObjectsV2Command) {
        expect(command.input.Prefix).toBe('tenant-a/fragments/');
        return {
          Contents: [
            { Key: 'tenant-a/fragments/payments/run-1/manifest.json' },
            { Key: 'tenant-a/fragments/payments/run-1/files/context.yaml' },
          ],
          IsTruncated: false,
        };
      }
      throw new Error('unexpected command');
    });

    const storage = createS3ObjectStorage(
      {
        provider: 's3',
        bucket: 'catalog',
        accessKeyId: 'key',
        secretAccessKey: 'secret',
        keyPrefix: 'tenant-a',
      },
      { send }
    );

    await expect(storage.listObjectKeys('fragments/')).resolves.toEqual([
      'fragments/payments/run-1/files/context.yaml',
      'fragments/payments/run-1/manifest.json',
    ]);
  });

  it('maps S3 412 responses to ObjectStoragePreconditionFailedError', async () => {
    const send = vi.fn(async () => {
      const error = new Error('Precondition Failed') as Error & {
        name: string;
        $metadata: { httpStatusCode: number };
      };
      error.name = 'PreconditionFailed';
      error.$metadata = { httpStatusCode: 412 };
      throw error;
    });

    const storage = createS3ObjectStorage(
      {
        provider: 'r2',
        bucket: 'catalog',
        accessKeyId: 'key',
        secretAccessKey: 'secret',
      },
      { send }
    );

    await expect(
      storage.putObject({ key: 'latest/manifest.json', body: '{}', ifMatch: 'stale' })
    ).rejects.toBeInstanceOf(ObjectStoragePreconditionFailedError);
  });
});

describe('Feature: in-memory object storage CAS', () => {
  it('supports list and compare-and-swap puts', async () => {
    const storage = new InMemoryObjectStorage();
    await storage.putObject({ key: 'latest/manifest.json', body: '{"revision":"a"}' });
    const meta = await storage.getObjectWithMeta('latest/manifest.json');
    await expect(
      storage.putObject({
        key: 'latest/manifest.json',
        body: '{"revision":"b"}',
        ifMatch: 'wrong',
      })
    ).rejects.toBeInstanceOf(ObjectStoragePreconditionFailedError);

    await storage.putObject({
      key: 'latest/manifest.json',
      body: '{"revision":"b"}',
      ifMatch: meta.etag,
    });
    await expect(storage.listObjectKeys('latest/')).resolves.toEqual(['latest/manifest.json']);
  });
});
