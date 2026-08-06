import {
  applySuggestionOverlays,
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
import type { PublishDryRunResult, PublishUploadResult } from './formatPublishDryRunResult.ts';
import {
  prepareRemoteCatalogSnapshot,
  toPublishDryRunResult,
  toPublishUploadResult,
} from './prepareRemoteCatalogSnapshot.ts';

const DEFAULT_WORKSPACE_NAME = 'blueprints';

export type ComposeCatalogDeps = {
  resolveStorage: (plan: CatalogComposeCliPlan) => ObjectStoragePort | null;
  loadFragments?: (storage: ObjectStoragePort) => Promise<EstateFragment[]>;
  loadOverlays?: (storage: ObjectStoragePort) => Promise<SuggestionOverlay[]>;
  now?: () => Date;
  /** Injectable delay between CAS retries (tests). Defaults to real sleep. */
  sleep?: (ms: number) => Promise<void>;
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
      result: PublishUploadResult & { objects: PublishDryRunResult['objects'] };
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

/** Exponential backoff before CAS retry attempt N (1-based after first failure). Caps at 2s. */
export function composeCasBackoffMs(failedAttempts: number): number {
  return Math.min(2000, 100 * 2 ** Math.max(0, failedAttempts - 1));
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

type PreparedCompose = {
  contributors: ReturnType<typeof composeEstateFragments>['contributors'];
  appliedOverlays: SuggestionOverlay[];
  yamlObjects: Array<{ path: string; content: string }>;
  validation: BlueprintValidationResult;
  parseErrors: Array<{ path: string; message: string }>;
  snapshotPlan: ReturnType<typeof prepareRemoteCatalogSnapshot>['snapshotPlan'];
};

async function prepareCompose(
  plan: CatalogComposeCliPlan,
  storage: ObjectStoragePort,
  deps: ComposeCatalogDeps
): Promise<
  | { kind: 'no-fragments' }
  | {
      kind: 'validation-failed';
      validation: BlueprintValidationResult;
      parseErrors: PreparedCompose['parseErrors'];
    }
  | { kind: 'ready'; prepared: PreparedCompose }
> {
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

  const { snapshotPlan } = prepareRemoteCatalogSnapshot({
    yamlObjects,
    workspaceName: plan.workspaceName ?? plan.estateId ?? DEFAULT_WORKSPACE_NAME,
    publishedAt: (deps.now ?? (() => new Date()))().toISOString(),
  });

  return {
    kind: 'ready',
    prepared: {
      contributors: composed.contributors,
      appliedOverlays: withOverlays.applied,
      yamlObjects,
      validation,
      parseErrors,
      snapshotPlan,
    },
  };
}

export async function runComposeCatalog(
  plan: CatalogComposeCliPlan,
  deps: ComposeCatalogDeps
): Promise<ComposeCatalogOutcome> {
  const storage = deps.resolveStorage(plan);
  if (!storage) return { kind: 'storage-not-configured' };

  const sleep = deps.sleep ?? defaultSleep;
  let preparedResult = await prepareCompose(plan, storage, deps);
  if (preparedResult.kind === 'no-fragments') return { kind: 'no-fragments' };
  if (preparedResult.kind === 'validation-failed') {
    return {
      kind: 'validation-failed',
      validation: preparedResult.validation,
      parseErrors: preparedResult.parseErrors,
    };
  }

  let prepared = preparedResult.prepared;

  if (plan.dryRun) {
    return {
      kind: 'dry-run',
      contributors: prepared.contributors,
      appliedOverlays: prepared.appliedOverlays,
      result: toPublishDryRunResult(prepared.snapshotPlan, prepared.validation),
    };
  }

  for (let attempt = 1; attempt <= plan.maxRetries; attempt += 1) {
    if (attempt > 1) {
      await sleep(composeCasBackoffMs(attempt - 1));
      preparedResult = await prepareCompose(plan, storage, deps);
      if (preparedResult.kind === 'no-fragments') return { kind: 'no-fragments' };
      if (preparedResult.kind === 'validation-failed') {
        return {
          kind: 'validation-failed',
          validation: preparedResult.validation,
          parseErrors: preparedResult.parseErrors,
        };
      }
      prepared = preparedResult.prepared;
    }

    const cas = await readLatestEtag(storage);
    try {
      const upload = await uploadRemoteCatalogSnapshot(prepared.snapshotPlan, storage, {
        latestIfMatch: cas.ifMatch,
        latestIfNoneMatch: cas.ifNoneMatch,
      });
      return {
        kind: 'uploaded',
        attempts: attempt,
        contributors: prepared.contributors,
        appliedOverlays: prepared.appliedOverlays,
        result: {
          ...toPublishUploadResult(prepared.snapshotPlan, prepared.validation, storage, upload),
          objects: prepared.snapshotPlan.objects,
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
