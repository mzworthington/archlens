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
  const estateId = flagValue(rest, '--estate');
  if (!estateId?.trim()) {
    throw new Error('archlens catalog compose requires --estate=<id>');
  }
  const maxRetriesRaw = flagValue(rest, '--max-retries');
  const maxRetriesParsed = maxRetriesRaw === undefined ? 3 : Number(maxRetriesRaw);
  const maxRetries =
    Number.isFinite(maxRetriesParsed) && maxRetriesParsed >= 1 ? Math.trunc(maxRetriesParsed) : 3;

  return {
    estateId: estateId.trim(),
    format: parseOutputFormat(rest),
    dryRun: !rest.includes('--no-dry-run'),
    skipValidation: resolvePublishSkipValidation(rest),
    allowEmpty: rest.includes('--allow-empty'),
    workspaceName: flagValue(rest, '--workspace-name'),
    maxRetries,
    storageProvider: parseStorageProvider(rest),
    bucket: flagValue(rest, '--bucket'),
    accountId: flagValue(rest, '--account-id'),
    keyPrefix: flagValue(rest, '--key-prefix') ?? defaultEstateKeyPrefix(estateId.trim()),
  };
}

export function parseCatalogPublishFragmentArgv(argv: string[]): CatalogPublishFragmentCliPlan {
  const rest = argv[0] === 'catalog' ? argv.slice(2) : argv;
  const positional = positionalArgs(rest);
  const estateId = flagValue(rest, '--estate');
  const productId = flagValue(rest, '--product') ?? flagValue(rest, '--product-id');
  const sourceRef = flagValue(rest, '--source-ref');
  if (!estateId?.trim()) {
    throw new Error('archlens catalog publish-fragment requires --estate=<id>');
  }
  if (!productId?.trim()) {
    throw new Error('archlens catalog publish-fragment requires --product=<id>');
  }
  if (!sourceRef?.trim()) {
    throw new Error('archlens catalog publish-fragment requires --source-ref=<ref>');
  }

  const systemId = flagValue(rest, '--system') ?? flagValue(rest, '--system-id');
  return {
    targetPath: flagValue(rest, '--path') ?? positional[0] ?? 'blueprints',
    estateId: estateId.trim(),
    productId: productId.trim(),
    ...(systemId?.trim() ? { systemId: systemId.trim() } : {}),
    fragmentKey: flagValue(rest, '--fragment-key'),
    sourceRef: sourceRef.trim(),
    runId: flagValue(rest, '--run-id'),
    format: parseOutputFormat(rest),
    dryRun: !rest.includes('--no-dry-run'),
    skipValidation: resolvePublishSkipValidation(rest),
    storageProvider: parseStorageProvider(rest),
    bucket: flagValue(rest, '--bucket'),
    accountId: flagValue(rest, '--account-id'),
    keyPrefix: flagValue(rest, '--key-prefix') ?? defaultEstateKeyPrefix(estateId.trim()),
  };
}

export function parseCatalogAcceptOverlayArgv(argv: string[]): CatalogAcceptOverlayCliPlan {
  const rest = argv[0] === 'catalog' ? argv.slice(2) : argv;
  const positional = positionalArgs(rest);
  const estateId = flagValue(rest, '--estate');
  const overlayFile = flagValue(rest, '--file') ?? positional[0];
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
    dryRun: !rest.includes('--no-dry-run'),
    storageProvider: parseStorageProvider(rest),
    bucket: flagValue(rest, '--bucket'),
    accountId: flagValue(rest, '--account-id'),
    keyPrefix: flagValue(rest, '--key-prefix') ?? defaultEstateKeyPrefix(estateId.trim()),
  };
}

export function parseCatalogRejectOverlayArgv(argv: string[]): CatalogRejectOverlayCliPlan {
  const rest = argv[0] === 'catalog' ? argv.slice(2) : argv;
  const estateId = flagValue(rest, '--estate');
  const overlayId = flagValue(rest, '--overlay-id') ?? flagValue(rest, '--id');
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
    dryRun: !rest.includes('--no-dry-run'),
    storageProvider: parseStorageProvider(rest),
    bucket: flagValue(rest, '--bucket'),
    accountId: flagValue(rest, '--account-id'),
    keyPrefix: flagValue(rest, '--key-prefix') ?? defaultEstateKeyPrefix(estateId.trim()),
  };
}

export function parseCatalogPruneArgv(argv: string[]): CatalogPruneCliPlan {
  const rest = argv[0] === 'catalog' ? argv.slice(2) : argv;
  const estateId = flagValue(rest, '--estate');
  if (!estateId?.trim()) {
    throw new Error('archlens catalog prune requires --estate=<id>');
  }
  return {
    estateId: estateId.trim(),
    format: parseOutputFormat(rest),
    dryRun: !rest.includes('--no-dry-run'),
    keepSnapshotCount: parsePositiveIntFlag(rest, '--keep-snapshots', 7),
    keepSnapshotDays: parsePositiveIntFlag(rest, '--keep-snapshot-days', 14),
    keepFragmentRuns: parsePositiveIntFlag(rest, '--keep-fragment-runs', 2),
    storageProvider: parseStorageProvider(rest),
    bucket: flagValue(rest, '--bucket'),
    accountId: flagValue(rest, '--account-id'),
    keyPrefix: flagValue(rest, '--key-prefix') ?? defaultEstateKeyPrefix(estateId.trim()),
  };
}
