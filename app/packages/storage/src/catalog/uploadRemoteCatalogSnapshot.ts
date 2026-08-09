import {
  materializeRemoteCatalogSnapshotBodies,
  remoteCatalogLatestManifestKey,
  remoteCatalogSnapshotManifestKey,
  type RemoteCatalogSnapshotPlan,
} from '@archlens/core';
import type { ObjectStoragePort } from '../ports/objectStoragePort';
import { uploadObjects } from '../lib/uploadObjects';

export type CatalogSnapshotUploadResult = {
  revisionId: string;
  provider: ObjectStoragePort['provider'];
  uploadedObjects: number;
  /** True when snapshot objects were already present and only `latest` was written. */
  reusedExistingSnapshot: boolean;
};

export type UploadRemoteCatalogSnapshotOptions = {
  /** CAS: update `latest/manifest.json` only if ETag matches. */
  latestIfMatch?: string;
  /** CAS: create `latest/manifest.json` only if missing (`*`). */
  latestIfNoneMatch?: string;
};

async function snapshotManifestExists(
  storage: ObjectStoragePort,
  revisionId: string
): Promise<boolean> {
  try {
    await storage.getObject(remoteCatalogSnapshotManifestKey(revisionId));
    return true;
  } catch {
    return false;
  }
}

export async function uploadRemoteCatalogSnapshot(
  plan: RemoteCatalogSnapshotPlan,
  storage: ObjectStoragePort,
  options: UploadRemoteCatalogSnapshotOptions = {}
): Promise<CatalogSnapshotUploadResult> {
  const latestKey = remoteCatalogLatestManifestKey();
  const reuseExisting = await snapshotManifestExists(storage, plan.revisionId);
  const materialized = materializeRemoteCatalogSnapshotBodies(plan).map(object => {
    if (object.key !== latestKey) return object;
    return {
      ...object,
      ...(options.latestIfMatch ? { ifMatch: options.latestIfMatch } : {}),
      ...(options.latestIfNoneMatch ? { ifNoneMatch: options.latestIfNoneMatch } : {}),
    };
  });
  const bodies = reuseExisting
    ? materialized.filter(object => object.key === latestKey)
    : materialized;

  const result = await uploadObjects(storage, bodies, {
    writeLastKeys: [latestKey],
  });

  return {
    revisionId: plan.revisionId,
    provider: storage.provider,
    uploadedObjects: result.uploadedObjects,
    reusedExistingSnapshot: reuseExisting,
  };
}
