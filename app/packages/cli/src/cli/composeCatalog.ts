import {
  applySuggestionOverlays,
  buildRemoteCatalogSnapshotPlan,
  composeEstateFragments,
  parseSchemaFromYaml,
  remoteCatalogLatestManifestKey,
  validateBlueprintWorkspace,
  type BlueprintValidationResult,
  type EstateFragment,
  type SuggestionOverlay,
} from '@archlens/core';
import {
  loadEstateFragmentsFromStorage,
  loadSuggestionOverlaysFromStorage,
  ObjectStoragePreconditionFailedError,
  uploadRemoteCatalogSnapshot,
  type ObjectStoragePort,
} from '@archlens/storage';
import type { CatalogComposeCliPlan } from './parseArchlensArgv.ts';
import { computeRemoteCatalogRevisionId } from './remoteCatalogRevision.ts';
import { getArchlensVersion } from './version.ts';
import type { PublishDryRunResult, PublishUploadResult } from './formatPublishDryRunResult.ts';

const DEFAULT_WORKSPACE_NAME = 'blueprints';

export type ComposeCatalogDeps = {
  resolveStorage: (plan: CatalogComposeCliPlan) => ObjectStoragePort | null;
  loadFragments?: (storage: ObjectStoragePort) => Promise<EstateFragment[]>;
  loadOverlays?: (storage: ObjectStoragePort) => Promise<SuggestionOverlay[]>;
  now?: () => Date;
};

export type ComposeCatalogOutcome =
  | { kind: 'storage-not-configured' }
  | { kind: 'no-fragments' }
  | {
      kind: 'validation-failed';
      validation: BlueprintValidationResult;
      parseErrors: Array<{ path: string; message: string }>;
    }
  | {
      kind: 'dry-run';
      result: PublishDryRunResult;
      contributors: ReturnType<typeof composeEstateFragments>['contributors'];
      appliedOverlays: SuggestionOverlay[];
    }
  | {
      kind: 'uploaded';
      result: PublishUploadResult;
      contributors: ReturnType<typeof composeEstateFragments>['contributors'];
      appliedOverlays: SuggestionOverlay[];
      attempts: number;
    }
  | { kind: 'cas-conflict'; attempts: number };

async function readLatestEtag(
  storage: ObjectStoragePort
): Promise<{ ifMatch?: string; ifNoneMatch?: string }> {
  try {
    const meta = await storage.getObjectWithMeta(remoteCatalogLatestManifestKey());
    if (meta.etag) return { ifMatch: meta.etag };
    return {};
  } catch {
    return { ifNoneMatch: '*' };
  }
}

export async function runComposeCatalog(
  plan: CatalogComposeCliPlan,
  deps: ComposeCatalogDeps
): Promise<ComposeCatalogOutcome> {
  const storage = deps.resolveStorage(plan);
  if (!storage) return { kind: 'storage-not-configured' };

  const loadFragments = deps.loadFragments ?? loadEstateFragmentsFromStorage;
  const loadOverlays = deps.loadOverlays ?? loadSuggestionOverlaysFromStorage;
  const allFragments = await loadFragments(storage);
  const fragments = allFragments.filter(fragment => fragment.estateId === plan.estateId);
  if (fragments.length === 0) return { kind: 'no-fragments' };

  const composed = composeEstateFragments(fragments);
  const overlays = (await loadOverlays(storage)).filter(
    overlay => overlay.estateId === plan.estateId
  );
  const withOverlays = applySuggestionOverlays(composed.yamlObjects, overlays);
  const yamlObjects = withOverlays.yamlObjects;

  const parseErrors: Array<{ path: string; message: string }> = [];
  const schemas: Array<{ path: string; schema: ReturnType<typeof parseSchemaFromYaml> }> = [];
  for (const object of yamlObjects) {
    try {
      schemas.push({ path: object.path, schema: parseSchemaFromYaml(object.content) });
    } catch (error) {
      parseErrors.push({
        path: object.path,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const skipValidation = plan.skipValidation === true;
  const validation: BlueprintValidationResult = skipValidation
    ? { isValid: true, issues: [], filesChecked: yamlObjects.length }
    : validateBlueprintWorkspace(
        schemas,
        plan.workspaceName ?? plan.estateId ?? DEFAULT_WORKSPACE_NAME
      );

  if (!skipValidation && (!validation.isValid || parseErrors.length > 0)) {
    return { kind: 'validation-failed', validation, parseErrors };
  }

  const revisionId = computeRemoteCatalogRevisionId(yamlObjects);
  const snapshotPlan = buildRemoteCatalogSnapshotPlan({
    revisionId,
    yamlObjects,
    workspaceName: plan.workspaceName ?? plan.estateId ?? DEFAULT_WORKSPACE_NAME,
    toolVersion: `archlens ${getArchlensVersion()}`,
    publishedAt: (deps.now ?? (() => new Date()))().toISOString(),
  });

  if (plan.dryRun) {
    return {
      kind: 'dry-run',
      contributors: composed.contributors,
      appliedOverlays: withOverlays.applied,
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

  for (let attempt = 1; attempt <= plan.maxRetries; attempt += 1) {
    const cas = await readLatestEtag(storage);
    try {
      const upload = await uploadRemoteCatalogSnapshot(snapshotPlan, storage, {
        latestIfMatch: cas.ifMatch,
        latestIfNoneMatch: cas.ifNoneMatch,
      });
      return {
        kind: 'uploaded',
        attempts: attempt,
        contributors: composed.contributors,
        appliedOverlays: withOverlays.applied,
        result: {
          dryRun: false,
          revisionId: upload.revisionId,
          snapshotPrefix: snapshotPlan.snapshotPrefix,
          snapshotManifest: snapshotPlan.snapshotManifest,
          latestPointer: snapshotPlan.latestPointer,
          catalogEntryCount: snapshotPlan.catalog.length,
          objects: snapshotPlan.objects,
          validation,
          upload: {
            revisionId: upload.revisionId,
            provider: storage.provider,
            uploadedObjects: upload.uploadedObjects,
          },
        },
      };
    } catch (error) {
      if (error instanceof ObjectStoragePreconditionFailedError && attempt < plan.maxRetries) {
        continue;
      }
      if (error instanceof ObjectStoragePreconditionFailedError) {
        return { kind: 'cas-conflict', attempts: attempt };
      }
      throw error;
    }
  }

  return { kind: 'cas-conflict', attempts: plan.maxRetries };
}
