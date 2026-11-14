import {
  buildRemoteCatalogSnapshotPlan,
  type BlueprintValidationResult,
  type RemoteCatalogSnapshotPlan,
  type RemoteCatalogYamlObject,
} from '@archlens/core';
import type { ObjectStoragePort } from '@archlens/storage';
import { computeRemoteCatalogRevisionId } from './remoteCatalogRevision';
import type {
  PublishDryRunResult,
  PublishUploadResult,
  RemoteCatalogPublishResult,
} from '../format/formatPublishDryRunResult';

export type PreparedRemoteCatalogSnapshot = {
  revisionId: string;
  snapshotPlan: RemoteCatalogSnapshotPlan;
};

export function prepareRemoteCatalogSnapshot(input: {
  yamlObjects: RemoteCatalogYamlObject[];
  workspaceName: string;
  publishedAt?: string;
  toolVersion?: string;
}): PreparedRemoteCatalogSnapshot {
  const revisionId = computeRemoteCatalogRevisionId(input.yamlObjects);
  const snapshotPlan = buildRemoteCatalogSnapshotPlan({
    revisionId,
    yamlObjects: input.yamlObjects,
    workspaceName: input.workspaceName,
    toolVersion: input.toolVersion ?? 'archlens dev',
    ...(input.publishedAt ? { publishedAt: input.publishedAt } : {}),
  });
  return { revisionId, snapshotPlan };
}

export function toPublishDryRunResult(
  snapshotPlan: RemoteCatalogSnapshotPlan,
  validation: BlueprintValidationResult
): PublishDryRunResult {
  return {
    dryRun: true,
    revisionId: snapshotPlan.revisionId,
    snapshotPrefix: snapshotPlan.snapshotPrefix,
    snapshotManifest: snapshotPlan.snapshotManifest,
    latestPointer: snapshotPlan.latestPointer,
    catalogEntryCount: snapshotPlan.catalog.length,
    objects: snapshotPlan.objects,
    validation,
  };
}

export function toPublishUploadResult(
  snapshotPlan: RemoteCatalogSnapshotPlan,
  validation: BlueprintValidationResult,
  storage: ObjectStoragePort,
  upload: RemoteCatalogPublishResult
): PublishUploadResult {
  return {
    dryRun: false,
    revisionId: snapshotPlan.revisionId,
    snapshotPrefix: snapshotPlan.snapshotPrefix,
    snapshotManifest: snapshotPlan.snapshotManifest,
    latestPointer: snapshotPlan.latestPointer,
    catalogEntryCount: snapshotPlan.catalog.length,
    upload: {
      revisionId: upload.revisionId,
      provider: storage.provider,
      uploadedObjects: upload.uploadedObjects,
    },
    validation,
  };
}
