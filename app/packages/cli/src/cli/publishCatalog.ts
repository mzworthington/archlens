import {
  buildRemoteCatalogSnapshotPlan,
  validateBlueprintWorkspace,
  type BlueprintValidationResult,
  type RemoteCatalogYamlObject,
  type SystemSchema,
} from '@archlens/core';
import type { ObjectStoragePort } from '@archlens/storage';
import type { PublishCliPlan } from './parseArchlensArgv.ts';
import { computeRemoteCatalogRevisionId } from './remoteCatalogRevision.ts';
import { getArchlensVersion } from './version.ts';
import { uploadRemoteCatalogSnapshot } from './publishRemoteCatalog.ts';
import type { PublishDryRunResult, PublishUploadResult } from './formatPublishDryRunResult.ts';

const DEFAULT_WORKSPACE_NAME = 'blueprints';

export type PublishCatalogBlueprintFile = {
  relativePath: string;
  content: string;
  schema: SystemSchema;
};

export type PublishCatalogDeps = {
  loadBlueprintTree: (targetPath: string) => Promise<{
    files: PublishCatalogBlueprintFile[];
    parseErrors: Array<{ path: string; message: string }>;
  }>;
  resolveStorage: (plan: PublishCliPlan) => ObjectStoragePort | null;
};

export type PublishCatalogOutcome =
  | { kind: 'empty-workspace' }
  | {
      kind: 'validation-failed';
      validation: BlueprintValidationResult;
      parseErrors: Array<{ path: string; message: string }>;
    }
  | { kind: 'dry-run'; result: PublishDryRunResult }
  | { kind: 'storage-not-configured' }
  | { kind: 'uploaded'; result: PublishUploadResult };

export async function runPublishCatalog(
  plan: PublishCliPlan,
  deps: PublishCatalogDeps
): Promise<PublishCatalogOutcome> {
  const { files, parseErrors } = await deps.loadBlueprintTree(plan.targetPath);
  if (files.length === 0 && parseErrors.length === 0) {
    return { kind: 'empty-workspace' };
  }

  const validation = validateBlueprintWorkspace(
    files.map(file => ({ path: file.relativePath, schema: file.schema })),
    plan.workspaceName ?? DEFAULT_WORKSPACE_NAME
  );

  if (!validation.isValid || parseErrors.length > 0) {
    return { kind: 'validation-failed', validation, parseErrors };
  }

  const yamlObjects: RemoteCatalogYamlObject[] = files.map(file => ({
    path: file.relativePath,
    content: file.content,
  }));

  const revisionId = computeRemoteCatalogRevisionId(yamlObjects);
  const snapshotPlan = buildRemoteCatalogSnapshotPlan({
    revisionId,
    yamlObjects,
    workspaceName: plan.workspaceName ?? DEFAULT_WORKSPACE_NAME,
    toolVersion: `archlens ${getArchlensVersion()}`,
  });

  if (plan.dryRun) {
    return {
      kind: 'dry-run',
      result: {
        dryRun: true,
        revisionId: snapshotPlan.revisionId,
        snapshotPrefix: snapshotPlan.snapshotPrefix,
        snapshotManifest: snapshotPlan.snapshotManifest,
        latestPointer: snapshotPlan.latestPointer,
        catalogEntryCount: snapshotPlan.catalog.length,
        objects: snapshotPlan.objects,
        validation,
      },
    };
  }

  const storage = deps.resolveStorage(plan);
  if (!storage) {
    return { kind: 'storage-not-configured' };
  }

  const uploadResult = await uploadRemoteCatalogSnapshot(snapshotPlan, storage);
  return {
    kind: 'uploaded',
    result: {
      dryRun: false,
      revisionId: snapshotPlan.revisionId,
      snapshotPrefix: snapshotPlan.snapshotPrefix,
      snapshotManifest: snapshotPlan.snapshotManifest,
      latestPointer: snapshotPlan.latestPointer,
      catalogEntryCount: snapshotPlan.catalog.length,
      upload: {
        revisionId: uploadResult.revisionId,
        bucket: plan.bucket ?? storage.provider,
        uploadedObjects: uploadResult.uploadedObjects,
      },
      validation,
    },
  };
}
