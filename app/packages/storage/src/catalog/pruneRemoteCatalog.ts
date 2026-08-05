import {
  DEFAULT_CATALOG_PRUNE_POLICY,
  groupCatalogKeysForPrune,
  parseEstateFragmentManifest,
  parseRemoteCatalogLatestPointer,
  parseRemoteCatalogSnapshotManifest,
  planCatalogPrune,
  remoteCatalogLatestManifestKey,
  remoteCatalogSnapshotManifestKey,
  type CatalogPruneFragmentRunMeta,
  type CatalogPrunePlan,
  type CatalogPrunePolicy,
  type CatalogPruneSnapshotMeta,
} from '@archlens/core';
import type { ObjectStoragePort } from '../ports/objectStoragePort';

export type PruneRemoteCatalogOptions = {
  dryRun: boolean;
  policy?: CatalogPrunePolicy;
  now?: Date;
  /** Max concurrent deletes (default 16). */
  concurrency?: number;
};

export type PruneRemoteCatalogResult = {
  dryRun: boolean;
  plan: CatalogPrunePlan;
  deletedKeys: string[];
  latestRevision: string | null;
};

async function mapPool(
  items: readonly string[],
  concurrency: number,
  mapper: (key: string) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await mapper(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
}

async function readSnapshotMetas(
  storage: ObjectStoragePort,
  revisionIds: Iterable<string>
): Promise<CatalogPruneSnapshotMeta[]> {
  const metas: CatalogPruneSnapshotMeta[] = [];
  for (const revisionId of revisionIds) {
    try {
      const raw = JSON.parse(
        await storage.getObjectText(remoteCatalogSnapshotManifestKey(revisionId))
      ) as unknown;
      const manifest = parseRemoteCatalogSnapshotManifest(raw);
      metas.push({ revisionId: manifest.revision, publishedAt: manifest.publishedAt });
    } catch {
      metas.push({ revisionId, publishedAt: '1970-01-01T00:00:00.000Z' });
    }
  }
  return metas;
}

async function readFragmentRunMetas(
  storage: ObjectStoragePort,
  runKeys: Iterable<string>
): Promise<CatalogPruneFragmentRunMeta[]> {
  const metas: CatalogPruneFragmentRunMeta[] = [];
  for (const runKey of runKeys) {
    const [fragmentKey, runId] = runKey.split('/') as [string, string];
    try {
      const raw = JSON.parse(
        await storage.getObjectText(`fragments/${fragmentKey}/${runId}/manifest.json`)
      ) as unknown;
      const manifest = parseEstateFragmentManifest(raw);
      metas.push({
        fragmentKey: manifest.fragmentKey,
        runId: manifest.runId,
        publishedAt: manifest.publishedAt,
      });
    } catch {
      metas.push({
        fragmentKey,
        runId,
        publishedAt: '1970-01-01T00:00:00.000Z',
      });
    }
  }
  return metas;
}

/**
 * List estate catalog keys, plan retention (core), optionally delete.
 * Never deletes `latest/` or `overlays/`.
 */
export async function planAndOptionallyPruneRemoteCatalog(
  storage: ObjectStoragePort,
  options: PruneRemoteCatalogOptions
): Promise<PruneRemoteCatalogResult> {
  const objectKeys = await storage.listObjectKeys('');
  const grouped = groupCatalogKeysForPrune(objectKeys);

  let latestRevision: string | null = null;
  try {
    const raw = JSON.parse(
      await storage.getObjectText(remoteCatalogLatestManifestKey())
    ) as unknown;
    latestRevision = parseRemoteCatalogLatestPointer(raw).revision;
  } catch {
    latestRevision = null;
  }

  const snapshots = await readSnapshotMetas(storage, grouped.snapshotKeysByRevision.keys());
  const fragmentRuns = await readFragmentRunMetas(storage, grouped.fragmentKeysByRun.keys());

  const plan = planCatalogPrune({
    latestRevision,
    snapshots,
    fragmentRuns,
    objectKeys,
    policy: options.policy ?? DEFAULT_CATALOG_PRUNE_POLICY,
    now: options.now ?? new Date(),
  });

  if (options.dryRun) {
    return { dryRun: true, plan, deletedKeys: [], latestRevision };
  }

  await mapPool(plan.deleteKeys, options.concurrency ?? 16, key => storage.deleteObject(key));
  return { dryRun: false, plan, deletedKeys: plan.deleteKeys, latestRevision };
}
