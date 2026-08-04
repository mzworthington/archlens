import type { WorkspaceCatalogEntry } from './workspaceCatalog';
import { buildWorkspaceCatalogFromYamlFiles } from './buildWorkspaceCatalogFromYaml';
import { posixNormalize } from './posixPath';
export const REMOTE_CATALOG_CATALOG_PATH = 'catalog.json';

export type RemoteCatalogSnapshotManifest = {
  revision: string;
  publishedAt: string;
  toolVersion: string;
  workspaceName: string;
  catalogPath: string;
  objectCount: number;
};

export type RemoteCatalogLatestPointer = {
  revision: string;
  publishedAt: string;
  snapshotPrefix: string;
};

export type RemoteCatalogYamlObject = {
  path: string;
  content: string;
};

export type RemoteCatalogSnapshotObject = {
  key: string;
  bytes: number;
};

export type RemoteCatalogUploadObject = {
  key: string;
  body: string;
  contentType: string;
};

export type RemoteCatalogSnapshotPlan = {
  revisionId: string;
  snapshotPrefix: string;
  snapshotManifest: RemoteCatalogSnapshotManifest;
  latestPointer: RemoteCatalogLatestPointer;
  catalog: WorkspaceCatalogEntry[];
  yamlObjects: RemoteCatalogYamlObject[];
  objects: RemoteCatalogSnapshotObject[];
};

export type BuildRemoteCatalogSnapshotPlanInput = {
  revisionId: string;
  yamlObjects: RemoteCatalogYamlObject[];
  workspaceName: string;
  toolVersion: string;
  publishedAt?: string;
};

export function normalizeRemoteCatalogObjectPath(filePath: string): string {
  return posixNormalize(filePath.replace(/\\/g, '/'));
}

export function remoteCatalogSnapshotPrefix(revisionId: string): string {
  return `snapshots/${revisionId}/`;
}

export function remoteCatalogLatestManifestKey(): string {
  return 'latest/manifest.json';
}

export function remoteCatalogSnapshotManifestKey(revisionId: string): string {
  return `${remoteCatalogSnapshotPrefix(revisionId)}manifest.json`;
}

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid remote catalog manifest: ${field} must be a non-empty string`);
  }
}

function assertFiniteNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid remote catalog manifest: ${field} must be a non-negative number`);
  }
}

export function parseRemoteCatalogSnapshotManifest(data: unknown): RemoteCatalogSnapshotManifest {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid remote catalog snapshot manifest');
  }
  const record = data as Record<string, unknown>;
  assertNonEmptyString(record.revision, 'revision');
  assertNonEmptyString(record.publishedAt, 'publishedAt');
  assertNonEmptyString(record.toolVersion, 'toolVersion');
  assertNonEmptyString(record.workspaceName, 'workspaceName');
  assertNonEmptyString(record.catalogPath, 'catalogPath');
  assertFiniteNumber(record.objectCount, 'objectCount');

  return {
    revision: record.revision,
    publishedAt: record.publishedAt,
    toolVersion: record.toolVersion,
    workspaceName: record.workspaceName,
    catalogPath: record.catalogPath,
    objectCount: record.objectCount,
  };
}

export function parseRemoteCatalogLatestPointer(data: unknown): RemoteCatalogLatestPointer {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid remote catalog latest pointer');
  }
  const record = data as Record<string, unknown>;
  assertNonEmptyString(record.revision, 'revision');
  assertNonEmptyString(record.publishedAt, 'publishedAt');
  assertNonEmptyString(record.snapshotPrefix, 'snapshotPrefix');

  return {
    revision: record.revision,
    publishedAt: record.publishedAt,
    snapshotPrefix: record.snapshotPrefix,
  };
}

export function serializeWorkspaceCatalog(catalog: WorkspaceCatalogEntry[]): string {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

function byteLengthUtf8(value: string): number {
  return new TextEncoder().encode(value).length;
}

function normalizeYamlObjects(
  yamlObjects: readonly RemoteCatalogYamlObject[]
): RemoteCatalogYamlObject[] {
  const normalized = yamlObjects.map(object => ({
    path: normalizeRemoteCatalogObjectPath(object.path),
    content: object.content,
  }));

  const paths = normalized.map(object => object.path);
  const unique = new Set(paths);
  if (unique.size !== paths.length) {
    throw new Error('Remote catalog snapshot contains duplicate YAML paths');
  }

  return normalized;
}

/**
 * Build the publish layout for an immutable snapshot + latest pointer (ADR-0010).
 * Caller supplies `revisionId` (typically a content hash computed in the CLI).
 */
export function buildRemoteCatalogSnapshotPlan(
  input: BuildRemoteCatalogSnapshotPlanInput
): RemoteCatalogSnapshotPlan {
  const revisionId = input.revisionId.trim();
  if (!revisionId) {
    throw new Error('Remote catalog revisionId is required');
  }

  const yamlObjects = normalizeYamlObjects(input.yamlObjects);
  if (yamlObjects.length === 0) {
    throw new Error('Remote catalog snapshot requires at least one YAML object');
  }

  const catalog = buildWorkspaceCatalogFromYamlFiles(yamlObjects, input.workspaceName);
  const catalogPaths = new Set(catalog.map(entry => entry.path));
  for (const entry of catalog) {
    if (!yamlObjects.some(object => object.path === entry.path)) {
      throw new Error(
        `Remote catalog entry "${entry.path}" has no matching YAML object in the snapshot`
      );
    }
  }

  const orphanYaml = yamlObjects.filter(object => !catalogPaths.has(object.path));
  if (orphanYaml.length > 0) {
    throw new Error(
      `Remote catalog YAML object "${orphanYaml[0]!.path}" is not referenced by the workspace catalog`
    );
  }

  const publishedAt = input.publishedAt ?? new Date().toISOString();
  const snapshotPrefix = remoteCatalogSnapshotPrefix(revisionId);
  const catalogJson = serializeWorkspaceCatalog(catalog);

  const snapshotManifest: RemoteCatalogSnapshotManifest = {
    revision: revisionId,
    publishedAt,
    toolVersion: input.toolVersion,
    workspaceName: input.workspaceName,
    catalogPath: REMOTE_CATALOG_CATALOG_PATH,
    objectCount: yamlObjects.length,
  };

  const latestPointer: RemoteCatalogLatestPointer = {
    revision: revisionId,
    publishedAt,
    snapshotPrefix,
  };

  const objects: RemoteCatalogSnapshotObject[] = [
    {
      key: `${snapshotPrefix}${REMOTE_CATALOG_CATALOG_PATH}`,
      bytes: byteLengthUtf8(catalogJson),
    },
    ...yamlObjects.map(object => ({
      key: `${snapshotPrefix}${object.path}`,
      bytes: byteLengthUtf8(object.content),
    })),
    {
      key: remoteCatalogSnapshotManifestKey(revisionId),
      bytes: byteLengthUtf8(`${JSON.stringify(snapshotManifest, null, 2)}\n`),
    },
    {
      key: remoteCatalogLatestManifestKey(),
      bytes: byteLengthUtf8(`${JSON.stringify(latestPointer, null, 2)}\n`),
    },
  ];

  return {
    revisionId,
    snapshotPrefix,
    snapshotManifest,
    latestPointer,
    catalog,
    yamlObjects,
    objects,
  };
}

function jsonManifestBody(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * Build upload payloads for a snapshot. The `latest/manifest.json` entry is included
 * so callers can upload it last after all snapshot objects.
 */
export function materializeRemoteCatalogSnapshotBodies(
  plan: RemoteCatalogSnapshotPlan
): RemoteCatalogUploadObject[] {
  const catalogJson = serializeWorkspaceCatalog(plan.catalog);
  const snapshotManifestJson = jsonManifestBody(plan.snapshotManifest);
  const latestPointerJson = jsonManifestBody(plan.latestPointer);

  return [
    {
      key: `${plan.snapshotPrefix}${REMOTE_CATALOG_CATALOG_PATH}`,
      body: catalogJson,
      contentType: 'application/json',
    },
    ...plan.yamlObjects.map(object => ({
      key: `${plan.snapshotPrefix}${object.path}`,
      body: object.content,
      contentType: 'application/yaml',
    })),
    {
      key: remoteCatalogSnapshotManifestKey(plan.revisionId),
      body: snapshotManifestJson,
      contentType: 'application/json',
    },
    {
      key: remoteCatalogLatestManifestKey(),
      body: latestPointerJson,
      contentType: 'application/json',
    },
  ];
}
