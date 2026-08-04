import { describe, expect, it } from 'vitest';
import { InMemoryObjectStorage } from '../testing/inMemoryObjectStorage';
import { uploadObjects } from './uploadObjects';

describe('Feature: Atomic catalog snapshot upload', () => {
  it('writes deferred pointer keys only after all snapshot objects', async () => {
    const storage = new InMemoryObjectStorage();

    await uploadObjects(
      storage,
      [
        { key: 'latest/manifest.json', body: '{"revision":"rev1"}' },
        { key: 'snapshots/rev1/catalog.json', body: '[]' },
        { key: 'snapshots/rev1/app/context.yaml', body: 'yaml' },
      ],
      { writeLastKeys: ['latest/manifest.json'] }
    );

    expect(storage.putOrder.at(-1)).toBe('latest/manifest.json');
    expect(storage.putOrder.slice(0, 2)).toEqual([
      'snapshots/rev1/catalog.json',
      'snapshots/rev1/app/context.yaml',
    ]);
  });

  it('applies an optional key prefix for tenant-scoped buckets', async () => {
    const storage = new InMemoryObjectStorage();

    await uploadObjects(storage, [{ key: 'catalog.json', body: '[]' }], {
      keyPrefix: 'blueprints',
    });

    expect(storage.objects.has('blueprints/catalog.json')).toBe(true);
  });

  it('reports how many objects were uploaded', async () => {
    const storage = new InMemoryObjectStorage();
    const result = await uploadObjects(storage, [
      { key: 'a.yaml', body: 'a' },
      { key: 'b.yaml', body: 'b' },
    ]);
    expect(result.uploadedObjects).toBe(2);
  });
});
