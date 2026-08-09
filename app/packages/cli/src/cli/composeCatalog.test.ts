import { describe, expect, it } from 'vitest';
import { estateFragmentManifestKey, type EstateFragment } from '@archlens/core';
import {
  InMemoryObjectStorage,
  ObjectStoragePreconditionFailedError,
  uploadEstateFragment,
  uploadSuggestionOverlay,
} from '@archlens/storage';
import { composeCasBackoffMs, runComposeCatalog } from './composeCatalog.ts';
import { runPublishFragment } from './publishFragment.ts';

const noSleep = async (): Promise<void> => undefined;

function minimalYaml(entityRef: string): string {
  return `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: container
metadata:
  entityRef: ${entityRef}
  name: ${entityRef}
nodes:
  - entityRef: ${entityRef}/svc
    type: rest-api
    name: Service
dependencies: []
`;
}

function fragment(partial: Omit<EstateFragment, 'version' | 'objectPaths'>): EstateFragment {
  return {
    version: 1,
    ...partial,
    objectPaths: partial.objects.map(o => o.path),
  };
}

describe('Feature: catalog compose with CAS on latest', () => {
  it('composes staged fragments and CAS-updates latest', async () => {
    const storage = new InMemoryObjectStorage();
    await uploadEstateFragment(
      fragment({
        estateId: 'acme',
        productId: 'payments',
        fragmentKey: 'payments',
        sourceRef: 'a',
        runId: 'r1',
        publishedAt: '2026-01-01T00:00:00.000Z',
        objects: [{ path: 'systems/payments.yaml', content: minimalYaml('payments') }],
      }),
      storage
    );
    await uploadEstateFragment(
      fragment({
        estateId: 'acme',
        productId: 'checkout',
        fragmentKey: 'checkout',
        sourceRef: 'b',
        runId: 'r1',
        publishedAt: '2026-02-01T00:00:00.000Z',
        objects: [{ path: 'systems/checkout.yaml', content: minimalYaml('checkout') }],
      }),
      storage
    );

    const outcome = await runComposeCatalog(
      {
        estateId: 'acme',
        format: 'json',
        dryRun: false,
        skipValidation: true,
        maxRetries: 3,
        allowEmpty: false,
        keyPrefix: 'estates/acme',
      },
      { resolveStorage: () => storage, sleep: noSleep }
    );

    expect(outcome.kind).toBe('uploaded');
    if (outcome.kind !== 'uploaded') return;
    expect(outcome.contributors).toHaveLength(2);
    expect(outcome.appliedOverlays).toEqual([]);
    expect(outcome.reusedExistingSnapshot).toBe(false);
    expect(storage.objects.has('latest/manifest.json')).toBe(true);
    expect(storage.putOrder.at(-1)).toBe('latest/manifest.json');
  });

  it('skips upload when latest already points at the composed revision', async () => {
    const storage = new InMemoryObjectStorage();
    await uploadEstateFragment(
      fragment({
        estateId: 'acme',
        productId: 'payments',
        fragmentKey: 'payments',
        sourceRef: 'a',
        runId: 'r1',
        publishedAt: '2026-01-01T00:00:00.000Z',
        objects: [{ path: 'systems/payments.yaml', content: minimalYaml('payments') }],
      }),
      storage
    );

    const first = await runComposeCatalog(
      {
        estateId: 'acme',
        format: 'json',
        dryRun: false,
        skipValidation: true,
        maxRetries: 3,
        allowEmpty: false,
        keyPrefix: 'estates/acme',
      },
      {
        resolveStorage: () => storage,
        sleep: noSleep,
        now: () => new Date('2026-08-04T12:00:00.000Z'),
      }
    );
    expect(first.kind).toBe('uploaded');
    if (first.kind !== 'uploaded') return;

    const putsBefore = storage.putOrder.length;
    const second = await runComposeCatalog(
      {
        estateId: 'acme',
        format: 'json',
        dryRun: false,
        skipValidation: true,
        maxRetries: 3,
        allowEmpty: false,
        keyPrefix: 'estates/acme',
      },
      {
        resolveStorage: () => storage,
        sleep: noSleep,
        now: () => new Date('2026-08-04T13:00:00.000Z'),
      }
    );

    expect(second.kind).toBe('unchanged');
    if (second.kind !== 'unchanged') return;
    expect(second.revisionId).toBe(first.result.revisionId);
    expect(storage.putOrder.length).toBe(putsBefore);
  });

  it('retries transient storage errors then succeeds', async () => {
    const storage = new InMemoryObjectStorage();
    await uploadEstateFragment(
      fragment({
        estateId: 'acme',
        productId: 'payments',
        fragmentKey: 'payments',
        sourceRef: 'a',
        runId: 'r1',
        publishedAt: '2026-01-01T00:00:00.000Z',
        objects: [{ path: 'systems/payments.yaml', content: minimalYaml('payments') }],
      }),
      storage
    );

    let listCalls = 0;
    const originalList = storage.listObjectKeys.bind(storage);
    storage.listObjectKeys = async prefix => {
      listCalls += 1;
      if (listCalls === 1) {
        const error = new Error('We encountered an internal error. Please try again.') as Error & {
          name: string;
          Code: string;
          $metadata: { httpStatusCode: number };
        };
        error.name = 'InternalError';
        error.Code = 'InternalError';
        error.$metadata = { httpStatusCode: 500 };
        throw error;
      }
      return originalList(prefix);
    };

    const sleeps: number[] = [];
    const outcome = await runComposeCatalog(
      {
        estateId: 'acme',
        format: 'json',
        dryRun: false,
        skipValidation: true,
        maxRetries: 3,
        allowEmpty: false,
        keyPrefix: 'estates/acme',
      },
      {
        resolveStorage: () => storage,
        sleep: async ms => {
          sleeps.push(ms);
        },
      }
    );

    expect(outcome.kind).toBe('uploaded');
    if (outcome.kind === 'uploaded') {
      expect(outcome.attempts).toBe(2);
    }
    expect(listCalls).toBeGreaterThanOrEqual(2);
    expect(sleeps).toEqual([100]);
  });

  it('exposes capped exponential CAS backoff', () => {
    expect(composeCasBackoffMs(1)).toBe(100);
    expect(composeCasBackoffMs(2)).toBe(200);
    expect(composeCasBackoffMs(5)).toBe(1600);
    expect(composeCasBackoffMs(10)).toBe(2000);
  });

  it('applies accepted suggestion overlays during compose', async () => {
    const storage = new InMemoryObjectStorage();
    await uploadEstateFragment(
      fragment({
        estateId: 'acme',
        productId: 'payments',
        fragmentKey: 'payments',
        sourceRef: 'a',
        runId: 'r1',
        publishedAt: '2026-01-01T00:00:00.000Z',
        objects: [
          {
            path: 'context.yaml',
            content: `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  entityRef: estate
  name: Estate
nodes:
  - entityRef: estate/payments
    type: software-system
    name: Payments
dependencies: []
`,
          },
        ],
      }),
      storage
    );
    await uploadSuggestionOverlay(
      {
        version: 1,
        overlayId: 'add-billing',
        estateId: 'acme',
        status: 'accepted',
        kind: 'add-dependent',
        targetPath: 'context.yaml',
        sourceRef: 'canvas@user',
        acceptedAt: '2026-08-04T12:00:00.000Z',
        delta: {
          nodes: [
            {
              entityRef: 'estate/billing-api',
              type: 'software-system',
              name: 'Billing API',
              external: true,
            },
          ],
          dependencies: [
            { from: 'estate/payments', to: 'estate/billing-api', type: 'direct-call' },
          ],
        },
      },
      storage
    );

    const outcome = await runComposeCatalog(
      {
        estateId: 'acme',
        format: 'json',
        dryRun: true,
        skipValidation: true,
        maxRetries: 3,
        allowEmpty: false,
        keyPrefix: 'estates/acme',
      },
      { resolveStorage: () => storage, sleep: noSleep }
    );

    expect(outcome.kind).toBe('dry-run');
    if (outcome.kind !== 'dry-run') return;
    expect(outcome.appliedOverlays.map(o => o.overlayId)).toEqual(['add-billing']);
  });

  it('retries when latest CAS fails then succeeds', async () => {
    const storage = new InMemoryObjectStorage();
    await uploadEstateFragment(
      fragment({
        estateId: 'acme',
        productId: 'payments',
        fragmentKey: 'payments',
        sourceRef: 'a',
        runId: 'r1',
        publishedAt: '2026-01-01T00:00:00.000Z',
        objects: [{ path: 'systems/payments.yaml', content: minimalYaml('payments') }],
      }),
      storage
    );

    await seedLatest(storage);

    let latestPuts = 0;
    const originalPut = storage.putObject.bind(storage);
    storage.putObject = async request => {
      if (request.key === 'latest/manifest.json') {
        latestPuts += 1;
        if (latestPuts === 1) {
          throw new ObjectStoragePreconditionFailedError(request.key);
        }
      }
      return originalPut(request);
    };

    const sleeps: number[] = [];
    const outcome = await runComposeCatalog(
      {
        estateId: 'acme',
        format: 'json',
        dryRun: false,
        skipValidation: true,
        maxRetries: 3,
        allowEmpty: false,
        keyPrefix: 'estates/acme',
      },
      {
        resolveStorage: () => storage,
        sleep: async ms => {
          sleeps.push(ms);
        },
      }
    );

    expect(outcome.kind).toBe('uploaded');
    if (outcome.kind === 'uploaded') {
      expect(outcome.attempts).toBe(2);
    }
    expect(sleeps).toEqual([100]);
  });

  it('reloads fragments after a CAS conflict so a newer fragment is included', async () => {
    const storage = new InMemoryObjectStorage();
    await uploadEstateFragment(
      fragment({
        estateId: 'acme',
        productId: 'payments',
        fragmentKey: 'payments',
        sourceRef: 'a',
        runId: 'r1',
        publishedAt: '2026-01-01T00:00:00.000Z',
        objects: [{ path: 'systems/payments.yaml', content: minimalYaml('payments') }],
      }),
      storage
    );
    await seedLatest(storage);

    let latestPuts = 0;
    const originalPut = storage.putObject.bind(storage);
    storage.putObject = async request => {
      if (request.key === 'latest/manifest.json') {
        latestPuts += 1;
        if (latestPuts === 1) {
          await uploadEstateFragment(
            fragment({
              estateId: 'acme',
              productId: 'checkout',
              fragmentKey: 'checkout',
              sourceRef: 'b',
              runId: 'r1',
              publishedAt: '2026-02-01T00:00:00.000Z',
              objects: [{ path: 'systems/checkout.yaml', content: minimalYaml('checkout') }],
            }),
            storage
          );
          throw new ObjectStoragePreconditionFailedError(request.key);
        }
      }
      return originalPut(request);
    };

    const outcome = await runComposeCatalog(
      {
        estateId: 'acme',
        format: 'json',
        dryRun: false,
        skipValidation: true,
        maxRetries: 3,
        allowEmpty: false,
        keyPrefix: 'estates/acme',
      },
      { resolveStorage: () => storage, sleep: noSleep }
    );

    expect(outcome.kind).toBe('uploaded');
    if (outcome.kind !== 'uploaded') return;
    expect(outcome.attempts).toBe(2);
    expect(outcome.contributors.map(c => c.fragmentKey).sort()).toEqual(['checkout', 'payments']);
  });
});

async function seedLatest(storage: InMemoryObjectStorage): Promise<void> {
  await storage.putObject({ key: 'latest/manifest.json', body: '{"revision":"seed"}' });
}

describe('Feature: catalog publish-fragment', () => {
  it('stages a local tree as a fragment', async () => {
    const storage = new InMemoryObjectStorage();
    const outcome = await runPublishFragment(
      {
        targetPath: 'blueprints',
        estateId: 'acme',
        productId: 'payments',
        sourceRef: 'repo@abc',
        format: 'json',
        dryRun: false,
        skipValidation: true,
        keyPrefix: 'estates/acme',
        runId: 'run-1',
      },
      {
        loadBlueprintTree: async () => ({
          files: [
            {
              relativePath: 'systems/payments.yaml',
              content: minimalYaml('payments'),
              schema: {
                name: 'payments',
                version: '1',
                level: 'container',
                entityRef: 'payments',
                nodes: [],
                dependencies: [],
              },
            },
          ],
          parseErrors: [],
        }),
        resolveStorage: () => storage,
        now: () => new Date('2026-08-04T12:00:00.000Z'),
      }
    );

    expect(outcome.kind).toBe('uploaded');
    expect(storage.objects.has(estateFragmentManifestKey('payments', 'run-1'))).toBe(true);
  });
});
