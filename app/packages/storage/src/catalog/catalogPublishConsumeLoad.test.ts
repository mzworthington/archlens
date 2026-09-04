import { describe, expect, it, vi } from 'vitest';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createHttpObjectStorage } from '../adapters/httpObjectStorage';
import { createS3ObjectStorage } from '../adapters/s3ObjectStorage';
import { HTTP_TRANSIENT_FETCH_ATTEMPTS } from '../lib/httpTransientRetry';
import { uploadObjects } from '../lib/uploadObjects';

const noSleep = async (): Promise<void> => undefined;

function r2InternalError(): Error {
  const error = new Error('We encountered an internal error. Please try again.') as Error & {
    name: string;
    Code: string;
    $metadata: { httpStatusCode: number };
  };
  error.name = 'InternalError';
  error.Code = 'InternalError';
  error.$metadata = { httpStatusCode: 500 };
  return error;
}

function r2Config() {
  return {
    provider: 'r2' as const,
    bucket: 'catalog',
    accessKeyId: 'key',
    secretAccessKey: 'secret',
  };
}

describe('Feature: Catalog publish and consume under transient object-storage load', () => {
  it('consumes every object after three consecutive HTTP 500s per key', async () => {
    const attemptsByUrl = new Map<string, number>();
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const attempt = (attemptsByUrl.get(url) ?? 0) + 1;
      attemptsByUrl.set(url, attempt);
      if (attempt <= 3) {
        return new Response('InternalError', { status: 500 });
      }
      return new Response(`body-for-${url}`, { status: 200 });
    });

    const storage = createHttpObjectStorage({
      provider: 'http',
      baseUrl: 'https://blueprints.example.dev/',
      fetchImpl,
      sleep: noSleep,
    });

    const keys = Array.from({ length: 48 }, (_, index) => `snapshots/rev1/sys-${index}.yaml`);
    const bodies = await Promise.all(keys.map(key => storage.getObjectText(key)));

    expect(bodies).toHaveLength(48);
    expect(bodies.every(body => body.startsWith('body-for-'))).toBe(true);
    expect(HTTP_TRANSIENT_FETCH_ATTEMPTS).toBeGreaterThan(3);
    for (const key of keys) {
      expect(attemptsByUrl.get(`https://blueprints.example.dev/${key}`)).toBe(4);
    }
  });

  it('keeps consume concurrency capped while retrying 500s', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const attemptsByUrl = new Map<string, number>();
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      const attempt = (attemptsByUrl.get(url) ?? 0) + 1;
      attemptsByUrl.set(url, attempt);
      await Promise.resolve();
      inFlight -= 1;
      if (attempt <= 3) {
        return new Response('InternalError', { status: 500 });
      }
      return new Response('ok', { status: 200 });
    });

    const storage = createHttpObjectStorage({
      provider: 'http',
      baseUrl: 'https://blueprints.example.dev/',
      fetchImpl,
      sleep: noSleep,
    });

    const keys = Array.from({ length: 32 }, (_, index) => `snapshots/rev1/n-${index}.yaml`);
    const concurrency = 8;
    let nextIndex = 0;
    const results = new Array<string>(keys.length);

    async function worker(): Promise<void> {
      while (nextIndex < keys.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await storage.getObjectText(keys[index]!);
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    expect(results.every(body => body === 'ok')).toBe(true);
    expect(maxInFlight).toBeLessThanOrEqual(concurrency);
    expect(maxInFlight).toBeGreaterThan(1);
  });

  it('publishes a snapshot when each R2 put InternalErrors twice then succeeds', async () => {
    const attemptsByKey = new Map<string, number>();
    let inFlight = 0;
    let maxInFlight = 0;

    const send = vi.fn(async (command: unknown) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      try {
        await Promise.resolve();
        if (!(command instanceof PutObjectCommand)) {
          throw new Error('unexpected command');
        }
        const key = command.input.Key ?? '';
        const attempt = (attemptsByKey.get(key) ?? 0) + 1;
        attemptsByKey.set(key, attempt);
        if (attempt <= 2) {
          throw r2InternalError();
        }
        return {};
      } finally {
        inFlight -= 1;
      }
    });

    const storage = createS3ObjectStorage(r2Config(), { send, sleep: noSleep });
    const objects = Array.from({ length: 40 }, (_, index) => ({
      key: `snapshots/rev1/f-${index}.yaml`,
      body: `yaml-${index}`,
    }));

    const result = await uploadObjects(storage, objects, { concurrency: 16 });

    expect(result.uploadedObjects).toBe(40);
    expect(maxInFlight).toBeLessThanOrEqual(16);
    expect(maxInFlight).toBeGreaterThan(1);
    expect([...attemptsByKey.values()].every(attempts => attempts === 3)).toBe(true);
  });

  it('reads snapshot objects after two R2 InternalErrors per get', async () => {
    const attemptsByKey = new Map<string, number>();
    const send = vi.fn(async (command: unknown) => {
      if (!(command instanceof GetObjectCommand)) {
        throw new Error('unexpected command');
      }
      const key = command.input.Key ?? '';
      const attempt = (attemptsByKey.get(key) ?? 0) + 1;
      attemptsByKey.set(key, attempt);
      if (attempt <= 2) {
        throw r2InternalError();
      }
      return { Body: new TextEncoder().encode(`yaml-${key}`), ETag: '"etag"' };
    });

    const storage = createS3ObjectStorage(r2Config(), { send, sleep: noSleep });
    const keys = Array.from({ length: 24 }, (_, index) => `snapshots/rev1/g-${index}.yaml`);
    const bodies = await Promise.all(keys.map(key => storage.getObjectText(key)));

    expect(bodies).toHaveLength(24);
    expect(attemptsByKey.size).toBe(24);
    expect([...attemptsByKey.values()].every(attempts => attempts === 3)).toBe(true);
  });
});
