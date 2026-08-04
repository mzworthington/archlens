import type {
  ObjectStoragePort,
  ObjectStorageProvider,
  ObjectStoragePutRequest,
} from '../ports/objectStoragePort';

export type StoredObjectRecord = {
  body: Uint8Array;
  contentType?: string;
};

/**
 * Test double for `ObjectStoragePort` — records put order and object bodies.
 */
export class InMemoryObjectStorage implements ObjectStoragePort {
  readonly objects = new Map<string, StoredObjectRecord>();
  readonly putOrder: string[] = [];

  constructor(readonly provider: ObjectStorageProvider = 'r2') {}

  async getObject(key: string): Promise<Uint8Array> {
    const record = this.objects.get(key);
    if (!record) {
      throw new Error(`Object not found: ${key}`);
    }
    return record.body;
  }

  async getObjectText(key: string): Promise<string> {
    return new TextDecoder().decode(await this.getObject(key));
  }

  async putObject(request: ObjectStoragePutRequest): Promise<void> {
    const body =
      typeof request.body === 'string' ? new TextEncoder().encode(request.body) : request.body;
    this.putOrder.push(request.key);
    this.objects.set(request.key, { body, contentType: request.contentType });
  }
}
