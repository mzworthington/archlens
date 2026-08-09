import { describe, expect, it } from 'vitest';
import { buildRemoteCatalogSnapshotPlan, remoteCatalogLatestManifestKey } from '@archlens/core';
import { InMemoryObjectStorage } from '../testing/inMemoryObjectStorage';
import { uploadRemoteCatalogSnapshot } from './uploadRemoteCatalogSnapshot';

const v4 = 'https://archlens.dev/schemas/v4/blueprint.schema.json';

const contextYaml = `
version: ${v4}
level: context
metadata:
  entityRef: demo
  name: Demo
nodes: []
dependencies: []
`;

describe('Feature: Publish remote catalog snapshot', () => {
  it('uploads catalog, YAML, and manifests through the storage port', async () => {
    const storage = new InMemoryObjectStorage('r2');
    const plan = buildRemoteCatalogSnapshotPlan({
      revisionId: 'rev1',
      workspaceName: 'blueprints',
      toolVersion: 'archlens test',
      yamlObjects: [{ path: 'demo/context.yaml', content: contextYaml }],
    });

    const result = await uploadRemoteCatalogSnapshot(plan, storage);

    expect(result.revisionId).toBe('rev1');
    expect(result.provider).toBe('r2');
    expect(result.uploadedObjects).toBeGreaterThan(0);
    expect(storage.objects.has('snapshots/rev1/catalog.json')).toBe(true);
    expect(storage.objects.has('snapshots/rev1/demo/context.yaml')).toBe(true);
    expect(storage.objects.has('snapshots/rev1/manifest.json')).toBe(true);
    expect(storage.putOrder.at(-1)).toBe(remoteCatalogLatestManifestKey());
  });

  it('leaves a readable latest pointer that references the snapshot prefix', async () => {
    const storage = new InMemoryObjectStorage();
    const plan = buildRemoteCatalogSnapshotPlan({
      revisionId: 'rev1',
      workspaceName: 'blueprints',
      toolVersion: 'archlens test',
      yamlObjects: [{ path: 'demo/context.yaml', content: contextYaml }],
    });

    await uploadRemoteCatalogSnapshot(plan, storage);
    const latest = JSON.parse(await storage.getObjectText(remoteCatalogLatestManifestKey()));
    expect(latest.snapshotPrefix).toBe('snapshots/rev1/');
    expect(latest.revision).toBe('rev1');
  });

  it('reuses an existing snapshot and only CAS-updates latest', async () => {
    const storage = new InMemoryObjectStorage();
    const plan = buildRemoteCatalogSnapshotPlan({
      revisionId: 'rev1',
      workspaceName: 'blueprints',
      toolVersion: 'archlens test',
      yamlObjects: [{ path: 'demo/context.yaml', content: contextYaml }],
    });

    const first = await uploadRemoteCatalogSnapshot(plan, storage);
    expect(first.reusedExistingSnapshot).toBe(false);
    const putsAfterFirst = storage.putOrder.length;

    await storage.putObject({
      key: remoteCatalogLatestManifestKey(),
      body: JSON.stringify({
        revision: 'other',
        publishedAt: '2026-01-01T00:00:00.000Z',
        snapshotPrefix: 'snapshots/other/',
      }),
    });
    const meta = await storage.getObjectWithMeta(remoteCatalogLatestManifestKey());

    const second = await uploadRemoteCatalogSnapshot(plan, storage, {
      latestIfMatch: meta.etag,
    });
    expect(second.reusedExistingSnapshot).toBe(true);
    expect(second.uploadedObjects).toBe(1);
    expect(storage.putOrder.slice(putsAfterFirst + 1)).toEqual([remoteCatalogLatestManifestKey()]);
  });
});
