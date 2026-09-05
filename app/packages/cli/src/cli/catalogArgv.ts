import {
  defaultEstateKeyPrefix,
  flagValue,
  parseOutputFormat,
  parsePositiveIntFlag,
  parseStorageProvider,
  positionalArgs,
  resolvePublishSkipValidation,
  type OutputFormat,
} from './argvFlags.ts';
import { FLAG } from './cliFlagCatalog.ts';

export interface CatalogComposeCliPlan {
  estateId: string;
  format: OutputFormat;
  dryRun: boolean;
  skipValidation: boolean;
  /** When true, exit 0 if no fragments are staged (cron safety nets). */
  allowEmpty: boolean;
  workspaceName?: string;
  maxRetries: number;
  storageProvider?: 'r2' | 's3' | 'azure';
  bucket?: string;
  accountId?: string;
  keyPrefix?: string;
}

export interface CatalogPublishFragmentCliPlan {
  targetPath: string;
  estateId: string;
  productId: string;
  systemId?: string;
  fragmentKey?: string;
  sourceRef: string;
  runId?: string;
  format: OutputFormat;
  dryRun: boolean;
  skipValidation: boolean;
  storageProvider?: 'r2' | 's3' | 'azure';
  bucket?: string;
  accountId?: string;
  keyPrefix?: string;
}

export interface CatalogAcceptOverlayCliPlan {
  estateId: string;
  overlayFile: string;
  format: OutputFormat;
  dryRun: boolean;
  storageProvider?: 'r2' | 's3' | 'azure';
  bucket?: string;
  accountId?: string;
  keyPrefix?: string;
}

export interface CatalogRejectOverlayCliPlan {
  estateId: string;
  overlayId: string;
  format: OutputFormat;
  dryRun: boolean;
  storageProvider?: 'r2' | 's3' | 'azure';
  bucket?: string;
  accountId?: string;
  keyPrefix?: string;
}

export interface CatalogPruneCliPlan {
  estateId: string;
  format: OutputFormat;
  dryRun: boolean;
  keepSnapshotCount: number;
  keepSnapshotDays: number;
  keepFragmentRuns: number;
  storageProvider?: 'r2' | 's3' | 'azure';
  bucket?: string;
  accountId?: string;
  keyPrefix?: string;
}

export function parseCatalogComposeArgv(argv: string[]): CatalogComposeCliPlan {
  const rest = argv[0] === 'catalog' ? argv.slice(2) : argv;
  const estateId = flagValue(rest, FLAG.estate);
  if (!estateId?.trim()) {
    throw new Error('archlens catalog compose requires --estate=<id>');
  }
  const maxRetriesRaw = flagValue(rest, FLAG.maxRetries);
  // Default 8: concurrent estate composers (publish workflows + safety-net) need headroom.
  const maxRetriesParsed = maxRetriesRaw === undefined ? 8 : Number(maxRetriesRaw);
  const maxRetries =
    Number.isFinite(maxRetriesParsed) && maxRetriesParsed >= 1 ? Math.trunc(maxRetriesParsed) : 8;

  return {
    estateId: estateId.trim(),
    format: parseOutputFormat(rest),
    dryRun: !rest.includes(FLAG.noDryRun),
    skipValidation: resolvePublishSkipValidation(rest),
    allowEmpty: rest.includes(FLAG.allowEmpty),
    workspaceName: flagValue(rest, FLAG.workspaceName),
    maxRetries,
    storageProvider: parseStorageProvider(rest),
    bucket: flagValue(rest, FLAG.bucket),
    accountId: flagValue(rest, FLAG.accountId),
    keyPrefix: flagValue(rest, FLAG.keyPrefix) ?? defaultEstateKeyPrefix(estateId.trim()),
  };
}

export function parseCatalogPublishFragmentArgv(argv: string[]): CatalogPublishFragmentCliPlan {
  const rest = argv[0] === 'catalog' ? argv.slice(2) : argv;
  const positional = positionalArgs(rest);
  const estateId = flagValue(rest, FLAG.estate);
  const productId = flagValue(rest, FLAG.product) ?? flagValue(rest, FLAG.productId);
  const sourceRef = flagValue(rest, FLAG.sourceRef);
  if (!estateId?.trim()) {
    throw new Error('archlens catalog publish-fragment requires --estate=<id>');
  }
  if (!productId?.trim()) {
    throw new Error('archlens catalog publish-fragment requires --product=<id>');
  }
  if (!sourceRef?.trim()) {
    throw new Error('archlens catalog publish-fragment requires --source-ref=<ref>');
  }

  const systemId = flagValue(rest, FLAG.system) ?? flagValue(rest, FLAG.systemId);
  return {
    targetPath: flagValue(rest, FLAG.path) ?? positional[0] ?? 'blueprints',
    estateId: estateId.trim(),
    productId: productId.trim(),
    ...(systemId?.trim() ? { systemId: systemId.trim() } : {}),
    fragmentKey: flagValue(rest, FLAG.fragmentKey),
    sourceRef: sourceRef.trim(),
    runId: flagValue(rest, FLAG.runId),
    format: parseOutputFormat(rest),
    dryRun: !rest.includes(FLAG.noDryRun),
    skipValidation: resolvePublishSkipValidation(rest),
    storageProvider: parseStorageProvider(rest),
    bucket: flagValue(rest, FLAG.bucket),
    accountId: flagValue(rest, FLAG.accountId),
    keyPrefix: flagValue(rest, FLAG.keyPrefix) ?? defaultEstateKeyPrefix(estateId.trim()),
  };
}

export function parseCatalogAcceptOverlayArgv(argv: string[]): CatalogAcceptOverlayCliPlan {
  const rest = argv[0] === 'catalog' ? argv.slice(2) : argv;
  const positional = positionalArgs(rest);
  const estateId = flagValue(rest, FLAG.estate);
  const overlayFile = flagValue(rest, FLAG.file) ?? positional[0];
  if (!estateId?.trim()) {
    throw new Error('archlens catalog accept-overlay requires --estate=<id>');
  }
  if (!overlayFile?.trim()) {
    throw new Error('archlens catalog accept-overlay requires --file=<overlay.yaml>');
  }
  return {
    estateId: estateId.trim(),
    overlayFile: overlayFile.trim(),
    format: parseOutputFormat(rest),
    dryRun: !rest.includes(FLAG.noDryRun),
    storageProvider: parseStorageProvider(rest),
    bucket: flagValue(rest, FLAG.bucket),
    accountId: flagValue(rest, FLAG.accountId),
    keyPrefix: flagValue(rest, FLAG.keyPrefix) ?? defaultEstateKeyPrefix(estateId.trim()),
  };
}

export function parseCatalogRejectOverlayArgv(argv: string[]): CatalogRejectOverlayCliPlan {
  const rest = argv[0] === 'catalog' ? argv.slice(2) : argv;
  const estateId = flagValue(rest, FLAG.estate);
  const overlayId = flagValue(rest, FLAG.overlayId) ?? flagValue(rest, FLAG.overlayIdAlias);
  if (!estateId?.trim()) {
    throw new Error('archlens catalog reject-overlay requires --estate=<id>');
  }
  if (!overlayId?.trim()) {
    throw new Error('archlens catalog reject-overlay requires --overlay-id=<id>');
  }
  return {
    estateId: estateId.trim(),
    overlayId: overlayId.trim(),
    format: parseOutputFormat(rest),
    dryRun: !rest.includes(FLAG.noDryRun),
    storageProvider: parseStorageProvider(rest),
    bucket: flagValue(rest, FLAG.bucket),
    accountId: flagValue(rest, FLAG.accountId),
    keyPrefix: flagValue(rest, FLAG.keyPrefix) ?? defaultEstateKeyPrefix(estateId.trim()),
  };
}

export function parseCatalogPruneArgv(argv: string[]): CatalogPruneCliPlan {
  const rest = argv[0] === 'catalog' ? argv.slice(2) : argv;
  const estateId = flagValue(rest, FLAG.estate);
  if (!estateId?.trim()) {
    throw new Error('archlens catalog prune requires --estate=<id>');
  }
  return {
    estateId: estateId.trim(),
    format: parseOutputFormat(rest),
    dryRun: !rest.includes(FLAG.noDryRun),
    keepSnapshotCount: parsePositiveIntFlag(rest, FLAG.keepSnapshots, 7),
    keepSnapshotDays: parsePositiveIntFlag(rest, FLAG.keepSnapshotDays, 14),
    keepFragmentRuns: parsePositiveIntFlag(rest, FLAG.keepFragmentRuns, 2),
    storageProvider: parseStorageProvider(rest),
    bucket: flagValue(rest, FLAG.bucket),
    accountId: flagValue(rest, FLAG.accountId),
    keyPrefix: flagValue(rest, FLAG.keyPrefix) ?? defaultEstateKeyPrefix(estateId.trim()),
  };
}
