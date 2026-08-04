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

export async function uploadRemoteCatalogSnapshot(
  plan: RemoteCatalogSnapshotPlan,
  storage: ObjectStoragePort
): Promise<CatalogSnapshotUploadResult> {
  const bodies = materializeRemoteCatalogSnapshotBodies(plan).map(object => ({
    key: object.key,
    body: object.body,
    contentType: object.contentType,
  }));

  const result = await uploadObjects(storage, bodies, {
    writeLastKeys: [remoteCatalogLatestManifestKey()],
  });

  return {
    revisionId: plan.revisionId,
    provider: storage.provider,
    uploadedObjects: result.uploadedObjects,
  };
}
