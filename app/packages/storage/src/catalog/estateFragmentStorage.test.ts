import { describe, expect, it } from 'vitest';
import { composeEstateFragments, type EstateFragment } from '@archlens/core';
import { InMemoryObjectStorage } from '../testing/inMemoryObjectStorage';
import { loadEstateFragmentsFromStorage, uploadEstateFragment } from './estateFragmentStorage';

function fragment(partial: Omit<EstateFragment, 'version' | 'objectPaths'>): EstateFragment {
  return {
    version: 1,
    ...partial,
    objectPaths: partial.objects.map(o => o.path),
  };
}

describe('Feature: estate fragment staging in object storage', () => {
  it('uploads a fragment and reloads it for compose', async () => {
    const storage = new InMemoryObjectStorage();
    const payments = fragment({
      estateId: 'acme',
      productId: 'payments',
      fragmentKey: 'payments',
      sourceRef: 'repo@1',
      runId: 'run-1',
      publishedAt: '2026-01-01T00:00:00.000Z',
      objects: [{ path: 'systems/payments.yaml', content: 'payments: true\n' }],
    });
    const checkout = fragment({
      estateId: 'acme',
      productId: 'checkout',
      fragmentKey: 'checkout',
      sourceRef: 'repo@2',
      runId: 'run-1',
      publishedAt: '2026-02-01T00:00:00.000Z',
      objects: [{ path: 'systems/checkout.yaml', content: 'checkout: true\n' }],
    });

    await uploadEstateFragment(payments, storage);
    await uploadEstateFragment(checkout, storage);

    const loaded = await loadEstateFragmentsFromStorage(storage);
    expect(loaded).toHaveLength(2);

    const composed = composeEstateFragments(loaded);
    expect(composed.yamlObjects.map(o => o.path).sort()).toEqual([
      'systems/checkout.yaml',
      'systems/payments.yaml',
    ]);
    expect(storage.putOrder.at(-1)).toMatch(/manifest\.json$/);
  });

  it('loads YAML bodies only for the freshest run per fragmentKey', async () => {
    const storage = new InMemoryObjectStorage();
    await uploadEstateFragment(
      fragment({
        estateId: 'acme',
        productId: 'payments',
        fragmentKey: 'payments',
        sourceRef: 'old',
        runId: 'run-old',
        publishedAt: '2026-01-01T00:00:00.000Z',
        objects: [{ path: 'systems/payments.yaml', content: 'old: true\n' }],
      }),
      storage
    );
    await uploadEstateFragment(
      fragment({
        estateId: 'acme',
        productId: 'payments',
        fragmentKey: 'payments',
        sourceRef: 'new',
        runId: 'run-new',
        publishedAt: '2026-02-01T00:00:00.000Z',
        objects: [{ path: 'systems/payments.yaml', content: 'new: true\n' }],
      }),
      storage
    );

    const gets: string[] = [];
    const originalGet = storage.getObjectText.bind(storage);
    storage.getObjectText = async key => {
      gets.push(key);
      return originalGet(key);
    };

    const loaded = await loadEstateFragmentsFromStorage(storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.runId).toBe('run-new');
    expect(loaded[0]?.objects[0]?.content).toBe('new: true\n');
    expect(gets.filter(key => key.includes('/files/'))).toEqual([
      'fragments/payments/run-new/files/systems/payments.yaml',
    ]);
  });
});
