import pc from 'picocolors';
import type { RemoteCatalogSnapshotPlan } from '@archlens/core';
import type { BlueprintValidationResult } from '@archlens/core';
import type { OutputFormat } from './formatValidationResult.ts';
import type { RemoteCatalogPublishResult } from './publishRemoteCatalog.ts';

export type PublishDryRunResult = {
  dryRun: true;
  revisionId: string;
  snapshotPrefix: string;
  snapshotManifest: RemoteCatalogSnapshotPlan['snapshotManifest'];
  latestPointer: RemoteCatalogSnapshotPlan['latestPointer'];
  catalogEntryCount: number;
  objects: RemoteCatalogSnapshotPlan['objects'];
  validation: BlueprintValidationResult;
};

export type PublishUploadResult = {
  dryRun: false;
  revisionId: string;
  snapshotPrefix: string;
  snapshotManifest: RemoteCatalogSnapshotPlan['snapshotManifest'];
  latestPointer: RemoteCatalogSnapshotPlan['latestPointer'];
  catalogEntryCount: number;
  upload: RemoteCatalogPublishResult;
  validation: BlueprintValidationResult;
};

export function formatPublishDryRunResult(
  result: PublishDryRunResult,
  format: OutputFormat
): string {
  if (format === 'json') {
    return `${JSON.stringify(result, null, 2)}\n`;
  }

  const lines = [
    pc.green('✔ Remote catalog publish plan (dry run)'),
    '',
    `  ${pc.dim('Revision:')} ${result.revisionId}`,
    `  ${pc.dim('Snapshot prefix:')} ${result.snapshotPrefix}`,
    `  ${pc.dim('Catalog entries:')} ${result.catalogEntryCount}`,
    `  ${pc.dim('YAML objects:')} ${result.snapshotManifest.objectCount}`,
    `  ${pc.dim('Upload objects:')} ${result.objects.length}`,
    '',
    pc.dim('Objects:'),
    ...result.objects.map(object => `  ${object.key} (${object.bytes} bytes)`),
    '',
    pc.dim('Update latest/manifest.json after the snapshot upload completes.'),
  ];
  return `${lines.join('\n')}\n`;
}

export function formatPublishUploadResult(
  result: PublishUploadResult,
  format: OutputFormat
): string {
  if (format === 'json') {
    return `${JSON.stringify(result, null, 2)}\n`;
  }

  const lines = [
    pc.green('✔ Remote catalog published'),
    '',
    `  ${pc.dim('Revision:')} ${result.revisionId}`,
    `  ${pc.dim('Provider:')} ${result.upload.provider}`,
    `  ${pc.dim('Uploaded objects:')} ${result.upload.uploadedObjects}`,
    `  ${pc.dim('Catalog entries:')} ${result.catalogEntryCount}`,
  ];
  return `${lines.join('\n')}\n`;
}
