import * as p from '@clack/prompts';
import {
  defaultEstateKeyPrefix,
  type CatalogAcceptOverlayCliPlan,
  type CatalogComposeCliPlan,
  type CatalogPublishFragmentCliPlan,
  type CatalogRejectOverlayCliPlan,
  type PublishCliPlan,
} from './parseArchlensArgv.ts';

export type InteractiveMainAction =
  'scan' | 'publish' | 'publish-fragment' | 'compose' | 'accept-overlay' | 'reject-overlay';

export const INTERACTIVE_MAIN_ACTIONS: Array<{
  value: InteractiveMainAction;
  label: string;
  hint: string;
}> = [
  {
    value: 'scan',
    label: 'Scan architecture',
    hint: 'Source → BlueprintSpec YAML (wizard)',
  },
  {
    value: 'publish',
    label: 'Publish catalog snapshot',
    hint: 'Whole tree → ADR-0010 latest (single pipeline)',
  },
  {
    value: 'publish-fragment',
    label: 'Publish estate fragment',
    hint: 'Stage a product/slice for multi-pipeline compose',
  },
  {
    value: 'compose',
    label: 'Compose estate catalog',
    hint: 'Stitch fragments + overlays → latest snapshot',
  },
  {
    value: 'accept-overlay',
    label: 'Accept suggestion overlay',
    hint: 'Stage add-dependent (or similar) without editing snapshots',
  },
  {
    value: 'reject-overlay',
    label: 'Reject suggestion overlay',
    hint: 'Tombstone an overlay so the next compose drops it',
  },
];

export type AskPathFn = (message: string, defaultValue: string) => Promise<string>;

function cancelIfNeeded(value: unknown): asserts value is string | boolean {
  if (p.isCancel(value)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }
}

export async function promptInteractiveMainAction(): Promise<InteractiveMainAction> {
  const action = await p.select({
    message: 'What do you want to do?',
    options: INTERACTIVE_MAIN_ACTIONS.map(item => ({
      value: item.value,
      label: item.label,
      hint: item.hint,
    })),
  });
  if (p.isCancel(action)) {
    p.cancel('Cancelled.');
    process.exit(0);
  }
  return action;
}

export function buildInteractivePublishPlan(input: {
  targetPath: string;
  workspaceName?: string;
  keyPrefix?: string;
  upload: boolean;
}): PublishCliPlan {
  return {
    targetPath: input.targetPath.trim() || 'blueprints',
    format: 'text',
    dryRun: !input.upload,
    skipValidation: true,
    ...(input.workspaceName?.trim() ? { workspaceName: input.workspaceName.trim() } : {}),
    ...(input.keyPrefix?.trim() ? { keyPrefix: input.keyPrefix.trim() } : {}),
  };
}

export function buildInteractivePublishFragmentPlan(input: {
  targetPath: string;
  estateId: string;
  productId: string;
  systemId?: string;
  sourceRef: string;
  keyPrefix?: string;
  upload: boolean;
}): CatalogPublishFragmentCliPlan {
  const estateId = input.estateId.trim();
  return {
    targetPath: input.targetPath.trim() || 'blueprints',
    estateId,
    productId: input.productId.trim(),
    ...(input.systemId?.trim() ? { systemId: input.systemId.trim() } : {}),
    sourceRef: input.sourceRef.trim(),
    format: 'text',
    dryRun: !input.upload,
    skipValidation: true,
    keyPrefix: input.keyPrefix?.trim() || defaultEstateKeyPrefix(estateId),
  };
}

export function buildInteractiveComposePlan(input: {
  estateId: string;
  workspaceName?: string;
  keyPrefix?: string;
  upload: boolean;
  allowEmpty: boolean;
}): CatalogComposeCliPlan {
  const estateId = input.estateId.trim();
  return {
    estateId,
    format: 'text',
    dryRun: !input.upload,
    skipValidation: true,
    allowEmpty: input.allowEmpty,
    ...(input.workspaceName?.trim() ? { workspaceName: input.workspaceName.trim() } : {}),
    maxRetries: 3,
    keyPrefix: input.keyPrefix?.trim() || defaultEstateKeyPrefix(estateId),
  };
}

export function buildInteractiveAcceptOverlayPlan(input: {
  estateId: string;
  overlayFile: string;
  keyPrefix?: string;
  upload: boolean;
}): CatalogAcceptOverlayCliPlan {
  const estateId = input.estateId.trim();
  return {
    estateId,
    overlayFile: input.overlayFile.trim(),
    format: 'text',
    dryRun: !input.upload,
    keyPrefix: input.keyPrefix?.trim() || defaultEstateKeyPrefix(estateId),
  };
}

export function buildInteractiveRejectOverlayPlan(input: {
  estateId: string;
  overlayId: string;
  keyPrefix?: string;
  upload: boolean;
}): CatalogRejectOverlayCliPlan {
  const estateId = input.estateId.trim();
  return {
    estateId,
    overlayId: input.overlayId.trim(),
    format: 'text',
    dryRun: !input.upload,
    keyPrefix: input.keyPrefix?.trim() || defaultEstateKeyPrefix(estateId),
  };
}

async function promptUploadConfirm(message: string): Promise<boolean> {
  const upload = await p.confirm({
    message,
    initialValue: false,
  });
  cancelIfNeeded(upload);
  return upload;
}

export async function promptInteractivePublishPlan(askPath: AskPathFn): Promise<PublishCliPlan> {
  p.intro('Publish catalog snapshot');
  const targetPath = await askPath('Blueprint tree path', 'blueprints');
  const workspaceName = await p.text({
    message: 'Workspace name (entityRef root)',
    placeholder: 'blueprints',
    defaultValue: 'blueprints',
  });
  cancelIfNeeded(workspaceName);
  const keyPrefix = await p.text({
    message: 'Object key prefix (optional)',
    placeholder: 'estates/acme',
  });
  cancelIfNeeded(keyPrefix);
  const upload = await promptUploadConfirm('Upload to object storage now? (No = dry-run plan)');
  return buildInteractivePublishPlan({
    targetPath,
    workspaceName: workspaceName || undefined,
    keyPrefix: keyPrefix || undefined,
    upload,
  });
}

export async function promptInteractivePublishFragmentPlan(
  askPath: AskPathFn
): Promise<CatalogPublishFragmentCliPlan> {
  p.intro('Publish estate fragment');
  const targetPath = await askPath('Blueprint tree path', 'blueprints');
  const estateId = await p.text({
    message: 'Estate id',
    placeholder: 'acme',
    validate: value => (value.trim() ? undefined : 'Estate id is required'),
  });
  cancelIfNeeded(estateId);
  const productId = await p.text({
    message: 'Product id (composition key)',
    placeholder: 'payments',
    validate: value => (value.trim() ? undefined : 'Product id is required'),
  });
  cancelIfNeeded(productId);
  const systemId = await p.text({
    message: 'System id (optional path slice)',
    placeholder: 'api',
  });
  cancelIfNeeded(systemId);
  const sourceRef = await p.text({
    message: 'Source ref (repo@sha or CI run)',
    placeholder: 'github.com/org/repo@abc123',
    validate: value => (value.trim() ? undefined : 'Source ref is required'),
  });
  cancelIfNeeded(sourceRef);
  const keyPrefix = await p.text({
    message: 'Object key prefix',
    defaultValue: defaultEstateKeyPrefix(estateId.trim()),
  });
  cancelIfNeeded(keyPrefix);
  const upload = await promptUploadConfirm('Upload fragment now? (No = dry-run plan)');
  return buildInteractivePublishFragmentPlan({
    targetPath,
    estateId,
    productId,
    systemId: systemId || undefined,
    sourceRef,
    keyPrefix: keyPrefix || undefined,
    upload,
  });
}

export async function promptInteractiveComposePlan(): Promise<CatalogComposeCliPlan> {
  p.intro('Compose estate catalog');
  const estateId = await p.text({
    message: 'Estate id',
    placeholder: 'acme',
    validate: value => (value.trim() ? undefined : 'Estate id is required'),
  });
  cancelIfNeeded(estateId);
  const workspaceName = await p.text({
    message: 'Workspace name (optional)',
    placeholder: estateId.trim(),
  });
  cancelIfNeeded(workspaceName);
  const keyPrefix = await p.text({
    message: 'Object key prefix',
    defaultValue: defaultEstateKeyPrefix(estateId.trim()),
  });
  cancelIfNeeded(keyPrefix);
  const allowEmpty = await p.confirm({
    message: 'Succeed if no fragments are staged?',
    initialValue: false,
  });
  cancelIfNeeded(allowEmpty);
  const upload = await promptUploadConfirm(
    'Upload composed snapshot and flip latest? (No = dry-run plan)'
  );
  return buildInteractiveComposePlan({
    estateId,
    workspaceName: workspaceName || undefined,
    keyPrefix: keyPrefix || undefined,
    upload,
    allowEmpty,
  });
}

export async function promptInteractiveAcceptOverlayPlan(
  askPath: AskPathFn
): Promise<CatalogAcceptOverlayCliPlan> {
  p.intro('Accept suggestion overlay');
  const estateId = await p.text({
    message: 'Estate id',
    placeholder: 'acme',
    validate: value => (value.trim() ? undefined : 'Estate id is required'),
  });
  cancelIfNeeded(estateId);
  const overlayFile = await askPath('Overlay YAML file', 'overlay.yaml');
  const keyPrefix = await p.text({
    message: 'Object key prefix',
    defaultValue: defaultEstateKeyPrefix(estateId.trim()),
  });
  cancelIfNeeded(keyPrefix);
  const upload = await promptUploadConfirm('Upload overlay now? (No = dry-run plan)');
  return buildInteractiveAcceptOverlayPlan({
    estateId,
    overlayFile,
    keyPrefix: keyPrefix || undefined,
    upload,
  });
}

export async function promptInteractiveRejectOverlayPlan(): Promise<CatalogRejectOverlayCliPlan> {
  p.intro('Reject suggestion overlay');
  const estateId = await p.text({
    message: 'Estate id',
    placeholder: 'acme',
    validate: value => (value.trim() ? undefined : 'Estate id is required'),
  });
  cancelIfNeeded(estateId);
  const overlayId = await p.text({
    message: 'Overlay id',
    placeholder: 'add-billing',
    validate: value => (value.trim() ? undefined : 'Overlay id is required'),
  });
  cancelIfNeeded(overlayId);
  const keyPrefix = await p.text({
    message: 'Object key prefix',
    defaultValue: defaultEstateKeyPrefix(estateId.trim()),
  });
  cancelIfNeeded(keyPrefix);
  const upload = await promptUploadConfirm('Write reject tombstone now? (No = dry-run plan)');
  return buildInteractiveRejectOverlayPlan({
    estateId,
    overlayId,
    keyPrefix: keyPrefix || undefined,
    upload,
  });
}

/** True when bare interactive `archlens` should show the main action menu. */
export function shouldShowInteractiveMainMenu(plan: {
  isHeadless: boolean;
  watch: boolean;
  runEnrichOnly: boolean;
  publishAfterScan: boolean;
}): boolean {
  return !plan.isHeadless && !plan.watch && !plan.runEnrichOnly && !plan.publishAfterScan;
}
