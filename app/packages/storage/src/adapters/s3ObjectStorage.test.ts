import { describe, expect, it, vi } from 'vitest';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createS3ObjectStorage } from './s3ObjectStorage';

describe('Feature: S3-compatible object storage (R2 and AWS)', () => {
  it('stores and retrieves objects through the S3 API', async () => {
    const send = vi.fn(async command => {
      if (command instanceof PutObjectCommand) return {};
      if (command instanceof GetObjectCommand) {
        return { Body: new TextEncoder().encode('diagram-yaml') };
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
});
