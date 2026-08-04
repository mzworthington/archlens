import {
  materializeRemoteCatalogSnapshotBodies,
  remoteCatalogLatestManifestKey,
  type RemoteCatalogSnapshotPlan,
} from '@archlens/core';
import type { ObjectStoragePort } from '../ports/objectStoragePort';
import { uploadObjects } from '../lib/uploadObjects';

export type CatalogSnapshotUploadResult = {
  revisionId: string;
  provider: ObjectStoragePort['provider'];
  uploadedObjects: number;
};

export type UploadRemoteCatalogSnapshotOptions = {
  /** CAS: update `latest/manifest.json` only if ETag matches. */
  latestIfMatch?: string;
  /** CAS: create `latest/manifest.json` only if missing (`*`). */
  latestIfNoneMatch?: string;
};

export async function uploadRemoteCatalogSnapshot(
  plan: RemoteCatalogSnapshotPlan,
  storage: ObjectStoragePort,
  options: UploadRemoteCatalogSnapshotOptions = {}
): Promise<CatalogSnapshotUploadResult> {
  const latestKey = remoteCatalogLatestManifestKey();
  const bodies = materializeRemoteCatalogSnapshotBodies(plan).map(object => {
    if (object.key !== latestKey) return object;
    return {
      ...object,
      ...(options.latestIfMatch ? { ifMatch: options.latestIfMatch } : {}),
      ...(options.latestIfNoneMatch ? { ifNoneMatch: options.latestIfNoneMatch } : {}),
    };
  });

  const result = await uploadObjects(storage, bodies, {
    writeLastKeys: [latestKey],
  });

  return {
    revisionId: plan.revisionId,
    provider: storage.provider,
    uploadedObjects: result.uploadedObjects,
  };
}
