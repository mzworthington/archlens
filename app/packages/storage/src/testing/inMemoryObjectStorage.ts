import type {
  ObjectStorageObjectMeta,
  ObjectStoragePort,
  ObjectStorageProvider,
  ObjectStoragePutRequest,
} from '../ports/objectStoragePort';
import { ObjectStoragePreconditionFailedError } from '../ports/objectStoragePort';

export type StoredObjectRecord = {
  body: Uint8Array;
  contentType?: string;
  etag: string;
};

/**
 * Test double for `ObjectStoragePort` — records put order and object bodies.
 * Supports list + conditional put for ADR-0014 compose CAS tests.
 */
export class InMemoryObjectStorage implements ObjectStoragePort {
  readonly objects = new Map<string, StoredObjectRecord>();
  readonly putOrder: string[] = [];
  private etagCounter = 0;

  constructor(readonly provider: ObjectStorageProvider = 'r2') {}

  async getObject(key: string): Promise<Uint8Array> {
    return (await this.getObjectWithMeta(key)).body;
  }

  async getObjectText(key: string): Promise<string> {
    return new TextDecoder().decode(await this.getObject(key));
  }

  async getObjectWithMeta(key: string): Promise<ObjectStorageObjectMeta> {
    const record = this.objects.get(key);
    if (!record) {
      throw new Error(`Object not found: ${key}`);
    }
    return { body: record.body, etag: record.etag };
  }

  async listObjectKeys(prefix: string): Promise<string[]> {
    const normalized = prefix.replace(/^\/+/, '');
    return [...this.objects.keys()]
      .filter(key => key.startsWith(normalized))
      .sort((a, b) => a.localeCompare(b));
  }

  async putObject(request: ObjectStoragePutRequest): Promise<void> {
    const existing = this.objects.get(request.key);
    if (request.ifNoneMatch === '*') {
      if (existing) {
        throw new ObjectStoragePreconditionFailedError(request.key);
      }
    } else if (request.ifNoneMatch) {
      if (existing && existing.etag === request.ifNoneMatch.replaceAll('"', '')) {
        throw new ObjectStoragePreconditionFailedError(request.key);
      }
    }
    if (request.ifMatch !== undefined) {
      const expected = request.ifMatch.replaceAll('"', '');
      if (!existing || existing.etag !== expected) {
        throw new ObjectStoragePreconditionFailedError(request.key);
      }
    }

    const body =
      typeof request.body === 'string' ? new TextEncoder().encode(request.body) : request.body;
    this.etagCounter += 1;
    this.putOrder.push(request.key);
    this.objects.set(request.key, {
      body,
      contentType: request.contentType,
      etag: `etag-${this.etagCounter}`,
    });
  }

  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }
}
