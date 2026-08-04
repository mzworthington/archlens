import {
  defaultFragmentKey,
  sanitizeFragmentKeySegment,
  type EstateFragment,
} from '@archlens/core';
import {
  uploadEstateFragment,
  type ObjectStoragePort,
  type UploadEstateFragmentResult,
} from '@archlens/storage';
import type { CatalogPublishFragmentCliPlan } from './parseArchlensArgv.ts';
import type { BlueprintValidationResult } from '@archlens/core';
import { validateBlueprintWorkspace } from '@archlens/core';

const DEFAULT_WORKSPACE_NAME = 'blueprints';

export type PublishFragmentBlueprintFile = {
  relativePath: string;
  content: string;
  schema: Parameters<typeof validateBlueprintWorkspace>[0][number]['schema'];
};

export type PublishFragmentDeps = {
  loadBlueprintTree: (targetPath: string) => Promise<{
    files: PublishFragmentBlueprintFile[];
    parseErrors: Array<{ path: string; message: string }>;
  }>;
  resolveStorage: (plan: CatalogPublishFragmentCliPlan) => ObjectStoragePort | null;
  now?: () => Date;
  createRunId?: (now: Date) => string;
};

export type PublishFragmentOutcome =
  | { kind: 'empty-workspace' }
  | {
      kind: 'validation-failed';
      validation: BlueprintValidationResult;
      parseErrors: Array<{ path: string; message: string }>;
    }
  | {
      kind: 'dry-run';
      fragment: EstateFragment;
    }
  | { kind: 'storage-not-configured' }
  | { kind: 'uploaded'; fragment: EstateFragment; result: UploadEstateFragmentResult };

function defaultRunId(now: Date): string {
  return sanitizeFragmentKeySegment(now.toISOString());
}

export async function runPublishFragment(
  plan: CatalogPublishFragmentCliPlan,
  deps: PublishFragmentDeps
): Promise<PublishFragmentOutcome> {
  const { files, parseErrors } = await deps.loadBlueprintTree(plan.targetPath);
  if (files.length === 0 && parseErrors.length === 0) {
    return { kind: 'empty-workspace' };
  }

  const skipValidation = plan.skipValidation === true;
  const validation: BlueprintValidationResult = skipValidation
    ? { isValid: true, issues: [], filesChecked: files.length }
    : validateBlueprintWorkspace(
        files.map(file => ({ path: file.relativePath, schema: file.schema })),
        plan.estateId ?? DEFAULT_WORKSPACE_NAME
      );

  if (!skipValidation && (!validation.isValid || parseErrors.length > 0)) {
    return { kind: 'validation-failed', validation, parseErrors };
  }

  if (files.length === 0) {
    return { kind: 'empty-workspace' };
  }

  const now = (deps.now ?? (() => new Date()))();
  const runId = plan.runId?.trim()
    ? sanitizeFragmentKeySegment(plan.runId)
    : (deps.createRunId ?? defaultRunId)(now);
  const fragmentKey = plan.fragmentKey?.trim()
    ? sanitizeFragmentKeySegment(plan.fragmentKey)
    : defaultFragmentKey(plan.productId, plan.systemId);

  const fragment: EstateFragment = {
    version: 1,
    estateId: plan.estateId,
    productId: plan.productId,
    ...(plan.systemId ? { systemId: plan.systemId } : {}),
    fragmentKey,
    sourceRef: plan.sourceRef,
    runId,
    publishedAt: now.toISOString(),
    objectPaths: files.map(file => file.relativePath),
    objects: files.map(file => ({
      path: file.relativePath,
      content: file.content,
    })),
  };

  if (plan.dryRun) {
    return { kind: 'dry-run', fragment };
  }

  const storage = deps.resolveStorage(plan);
  if (!storage) return { kind: 'storage-not-configured' };

  const result = await uploadEstateFragment(fragment, storage);
  return { kind: 'uploaded', fragment, result };
}
