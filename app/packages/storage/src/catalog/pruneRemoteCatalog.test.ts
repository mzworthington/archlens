import { describe, expect, it } from 'vitest';
import {
  remoteCatalogLatestManifestKey,
  remoteCatalogSnapshotManifestKey,
  serializeEstateFragmentManifest,
} from '@archlens/core';
import { InMemoryObjectStorage } from '../testing/inMemoryObjectStorage';
import { planAndOptionallyPruneRemoteCatalog } from './pruneRemoteCatalog';

async function seedCatalog(storage: InMemoryObjectStorage): Promise<void> {
  await storage.putObject({
    key: remoteCatalogLatestManifestKey(),
    body: JSON.stringify({
      revision: 'rev-live',
      publishedAt: '2026-08-05T00:00:00.000Z',
      snapshotPrefix: 'snapshots/rev-live/',
    }),
  });
  for (const [revision, publishedAt] of [
    ['rev-live', '2026-08-05T00:00:00.000Z'],
    ['rev-old', '2026-01-01T00:00:00.000Z'],
  ] as const) {
    await storage.putObject({
      key: remoteCatalogSnapshotManifestKey(revision),
      body: JSON.stringify({
        revision,
        publishedAt,
        toolVersion: 'archlens test',
        workspaceName: 'samples',
        catalogPath: 'catalog.json',
        objectCount: 1,
      }),
    });
    await storage.putObject({
      key: `snapshots/${revision}/catalog.json`,
      body: '[]',
    });
  }

  for (const [runId, publishedAt] of [
    ['run-new', '2026-08-05T00:00:00.000Z'],
    ['run-mid', '2026-08-03T00:00:00.000Z'],
    ['run-old', '2026-08-01T00:00:00.000Z'],
  ] as const) {
    await storage.putObject({
      key: `fragments/archlens/${runId}/manifest.json`,
      body: serializeEstateFragmentManifest({
        version: 1,
        estateId: 'samples',
        productId: 'archlens',
        fragmentKey: 'archlens',
        sourceRef: 'test',
        runId,
        publishedAt,
        objectPaths: ['context.yaml'],
      }),
    });
    await storage.putObject({
      key: `fragments/archlens/${runId}/files/context.yaml`,
      body: 'version: x\n',
    });
  }

  await storage.putObject({
    key: 'overlays/keep.yaml',
    body: 'overlayId: keep\n',
  });
}

describe('Feature: prune remote catalog retention', () => {
  it('dry-run reports deletes without removing objects', async () => {
    const storage = new InMemoryObjectStorage();
    await seedCatalog(storage);

    const result = await planAndOptionallyPruneRemoteCatalog(storage, {
      dryRun: true,
      now: new Date('2026-08-05T12:00:00.000Z'),
      policy: { keepSnapshotCount: 1, keepSnapshotDays: 1, keepFragmentRunsPerKey: 2 },
    });

    expect(result.plan.deleteSnapshotRevisions).toEqual(['rev-old']);
    expect(result.plan.deleteFragmentRuns).toEqual([{ fragmentKey: 'archlens', runId: 'run-old' }]);
    expect(result.deletedKeys).toEqual([]);
    await expect(storage.getObjectText('snapshots/rev-old/catalog.json')).resolves.toBe('[]');
    await expect(storage.getObjectText('overlays/keep.yaml')).resolves.toContain('keep');
  });

  it('deletes planned keys when dryRun is false', async () => {
    const storage = new InMemoryObjectStorage();
    await seedCatalog(storage);

    const result = await planAndOptionallyPruneRemoteCatalog(storage, {
      dryRun: false,
      now: new Date('2026-08-05T12:00:00.000Z'),
      policy: { keepSnapshotCount: 1, keepSnapshotDays: 1, keepFragmentRunsPerKey: 2 },
    });

    expect(result.deletedKeys).toContain('snapshots/rev-old/catalog.json');
    expect(result.deletedKeys).toContain('fragments/archlens/run-old/files/context.yaml');
    await expect(storage.getObjectText('snapshots/rev-live/catalog.json')).resolves.toBe('[]');
    await expect(storage.getObjectText('latest/manifest.json')).resolves.toContain('rev-live');
    await expect(storage.getObjectText('overlays/keep.yaml')).resolves.toContain('keep');
    await expect(storage.getObjectText('snapshots/rev-old/catalog.json')).rejects.toThrow(
      /not found/
    );
  });
});
