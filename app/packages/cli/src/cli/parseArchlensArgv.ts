export interface ArchitectureCliFlags {
  parserType: string | undefined;
  glob: string | undefined;
  outputDir: string | undefined;
  context: string | undefined;
  systemName: string | undefined;
  rollupModules: boolean;
  ignore: string[];
  systems: string[] | undefined;
}

export interface GitForensicsCliFlags {
  sinceDays: number | undefined;
  maxCouplingCommitFiles: number | undefined;
  glob: string | undefined;
  ignore: string[];
  targetPath: string;
}

export interface ArchlensCliPlan {
  isHeadless: boolean;
  runArchitecture: boolean;
  /** Re-run externals pass on existing YAML only (no AST scan). */
  runEnrichOnly: boolean;
  runGitForensics: boolean;
  /** After a successful scan, upload the output tree via `archlens publish --no-dry-run`. */
  publishAfterScan: boolean;
  /** Forwarded to publish-after-scan (default skip; `--validate` gates; `--skip-validation` always allows). */
  publishSkipValidation: boolean;
  /** Forwarded to publish-after-scan (`--key-prefix` / `--workspace-name`). */
  publishKeyPrefix?: string;
  publishWorkspaceName?: string;
  /** True when CLI flags already decided git on/off (skip interactive git prompt). */
  gitDecisionExplicit: boolean;
  watch: boolean;
  watchDebounceMs: number;
  architecture: ArchitectureCliFlags;
  git: GitForensicsCliFlags;
}

export type OutputFormat = 'text' | 'json';
/** Resilience supports YAML for human-readable artifacts; CI keeps JSON. */
export type ResilienceOutputFormat = OutputFormat | 'yaml';

export interface ValidateCliPlan {
  targetPath: string;
  format: OutputFormat;
}

export interface DiffCliPlan {
  baselinePath: string;
  currentPath: string;
  format: OutputFormat;
}

export interface ResilienceCliPlan {
  targetPath: string;
  format: ResilienceOutputFormat;
  chaosSpecsDir?: string;
  /** Write AdviceLens artifact to this path (format from --format, or .yaml/.json extension). */
  outputPath?: string;
  minSla: number;
  failOnRecommendations: boolean;
  maxRegionOutageTargets?: number;
  maxFanInProbes?: number;
}

export interface PublishCliPlan {
  targetPath: string;
  format: OutputFormat;
  dryRun: boolean;
  /**
   * When true, do not fail publish/compose on workspace validation.
   * Default true: catalogs show reality; use `--validate` for an optional hard gate.
   * `--skip-validation` always allows push even if `--validate` is also set.
   */
  skipValidation: boolean;
  workspaceName?: string;
  storageProvider?: 'r2' | 's3' | 'azure';
  bucket?: string;
  accountId?: string;
  keyPrefix?: string;
}

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

export type ArchlensCommandPlan =
  | { kind: 'architecture'; plan: ArchlensCliPlan }
  | { kind: 'validate'; plan: ValidateCliPlan }
  | { kind: 'diff'; plan: DiffCliPlan }
  | { kind: 'resilience'; plan: ResilienceCliPlan }
  | { kind: 'publish'; plan: PublishCliPlan }
  | { kind: 'catalog-compose'; plan: CatalogComposeCliPlan }
  | { kind: 'catalog-publish-fragment'; plan: CatalogPublishFragmentCliPlan }
  | { kind: 'catalog-accept-overlay'; plan: CatalogAcceptOverlayCliPlan }
  | { kind: 'catalog-reject-overlay'; plan: CatalogRejectOverlayCliPlan };

export const DEFAULT_WATCH_DEBOUNCE_MS = 500;

function parseWatchDebounce(argv: string[]): number {
  const raw = flagValue(argv, '--watch-debounce');
  if (!raw) return DEFAULT_WATCH_DEBOUNCE_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_WATCH_DEBOUNCE_MS;
}

function flagValue(argv: string[], name: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const idx = argv.indexOf(name);
  if (idx !== -1 && argv[idx + 1] && !argv[idx + 1]!.startsWith('-')) {
    return argv[idx + 1];
  }
  return undefined;
}

function parseCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function parseSinceDays(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const days = Number(raw.replace(/d$/i, ''));
  return Number.isFinite(days) && days > 0 ? days : undefined;
}

function parseNonNegativeInt(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : undefined;
}

function hasExplicitGitDecision(argv: string[]): boolean {
  return (
    argv.includes('--git') ||
    argv.includes('--no-git') ||
    argv.includes('--git-only') ||
    argv.some(a => a.startsWith('--git-since')) ||
    argv[0] === 'forensics' ||
    (isEnrichArgv(argv) && argv.includes('--git'))
  );
}

export function isUpdateSubcommand(argv: string[]): boolean {
  return argv[0] === 'update';
}

export function isValidateSubcommand(argv: string[]): boolean {
  return argv[0] === 'validate';
}

export function isDiffSubcommand(argv: string[]): boolean {
  return argv[0] === 'diff';
}

export function isResilienceSubcommand(argv: string[]): boolean {
  return argv[0] === 'resilience';
}

export function isPublishSubcommand(argv: string[]): boolean {
  return argv[0] === 'publish';
}

export function isCatalogSubcommand(argv: string[]): boolean {
  return argv[0] === 'catalog';
}

function parseStorageProvider(argv: string[]): 'r2' | 's3' | 'azure' | undefined {
  const providerRaw = flagValue(argv, '--provider');
  return providerRaw === 'r2' || providerRaw === 's3' || providerRaw === 'azure'
    ? providerRaw
    : undefined;
}

export function defaultEstateKeyPrefix(estateId: string): string {
  return `estates/${estateId.replace(/^\/+|\/+$/g, '')}`;
}

/**
 * Publish / compose / fragment push paths favour visibility over gating.
 * Default: skip validation. `--validate` opts into a hard gate.
 * `--skip-validation` is always allowed and wins over `--validate`.
 */
export function resolvePublishSkipValidation(argv: string[]): boolean {
  if (argv.includes('--skip-validation')) return true;
  if (argv.includes('--validate')) return false;
  return true;
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

function parseOutputFormat(argv: string[]): OutputFormat {
  const raw = flagValue(argv, '--format');
  return raw === 'json' ? 'json' : 'text';
}

function parseResilienceOutputFormat(argv: string[]): ResilienceOutputFormat {
  const raw = flagValue(argv, '--format');
  if (raw === 'json') return 'json';
  if (raw === 'yaml' || raw === 'yml') return 'yaml';
  return 'text';
}

function positionalArgs(argv: string[]): string[] {
  return argv.filter(arg => !arg.startsWith('-'));
}

export function parseValidateArgv(argv: string[]): ValidateCliPlan {
  const rest = argv[0] === 'validate' ? argv.slice(1) : argv;
  const positional = positionalArgs(rest);
  const targetPath = flagValue(rest, '--path') ?? positional[0] ?? 'blueprints';
  return {
    targetPath,
    format: parseOutputFormat(rest),
  };
}

export function parseDiffArgv(argv: string[]): DiffCliPlan {
  const rest = argv[0] === 'diff' ? argv.slice(1) : argv;
  const positional = positionalArgs(rest);
  const baselinePath = flagValue(rest, '--baseline') ?? positional[0] ?? 'blueprints';
  const currentPath = flagValue(rest, '--current') ?? positional[1] ?? baselinePath;
  return {
    baselinePath,
    currentPath,
    format: parseOutputFormat(rest),
  };
}

function parsePositiveInt(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : undefined;
}

function parseSlaThreshold(raw: string | undefined): number {
  if (raw === undefined) return 100;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 100;
}

export function parseResilienceArgv(argv: string[]): ResilienceCliPlan {
  const rest = argv[0] === 'resilience' ? argv.slice(1) : argv;
  const positional = positionalArgs(rest);
  const targetPath = flagValue(rest, '--path') ?? positional[0] ?? 'blueprints';
  return {
    targetPath,
    format: parseResilienceOutputFormat(rest),
    chaosSpecsDir: flagValue(rest, '--chaos-specs'),
    outputPath: flagValue(rest, '--output'),
    minSla: parseSlaThreshold(flagValue(rest, '--min-sla')),
    failOnRecommendations: rest.includes('--fail-on-recommendations'),
    maxRegionOutageTargets: parsePositiveInt(flagValue(rest, '--max-region-outages')),
    maxFanInProbes: parsePositiveInt(flagValue(rest, '--max-fan-in-probes')),
  };
}

export function parsePublishArgv(argv: string[]): PublishCliPlan {
  const rest = argv[0] === 'publish' ? argv.slice(1) : argv;
  const positional = positionalArgs(rest);
  const targetPath = flagValue(rest, '--path') ?? positional[0] ?? 'blueprints';
  const workspaceName = flagValue(rest, '--workspace-name');
  return {
    targetPath,
    format: parseOutputFormat(rest),
    dryRun: !rest.includes('--no-dry-run'),
    skipValidation: resolvePublishSkipValidation(rest),
    workspaceName,
    storageProvider: parseStorageProvider(rest),
    bucket: flagValue(rest, '--bucket'),
    accountId: flagValue(rest, '--account-id'),
    keyPrefix: flagValue(rest, '--key-prefix'),
  };
}

export function parseArchlensCommand(argv: string[]): ArchlensCommandPlan {
  if (isValidateSubcommand(argv)) {
    return { kind: 'validate', plan: parseValidateArgv(argv) };
  }
  if (isDiffSubcommand(argv)) {
    return { kind: 'diff', plan: parseDiffArgv(argv) };
  }
  if (isResilienceSubcommand(argv)) {
    return { kind: 'resilience', plan: parseResilienceArgv(argv) };
  }
  if (isPublishSubcommand(argv)) {
    return { kind: 'publish', plan: parsePublishArgv(argv) };
  }
  if (isCatalogSubcommand(argv)) {
    const action = argv[1];
    if (action === 'compose') {
      return { kind: 'catalog-compose', plan: parseCatalogComposeArgv(argv) };
    }
    if (action === 'publish-fragment') {
      return { kind: 'catalog-publish-fragment', plan: parseCatalogPublishFragmentArgv(argv) };
    }
    if (action === 'accept-overlay') {
      return { kind: 'catalog-accept-overlay', plan: parseCatalogAcceptOverlayArgv(argv) };
    }
    if (action === 'reject-overlay') {
      return { kind: 'catalog-reject-overlay', plan: parseCatalogRejectOverlayArgv(argv) };
    }
    throw new Error(
      `Unknown catalog action "${action ?? ''}". Use: archlens catalog compose | publish-fragment | accept-overlay | reject-overlay`
    );
  }
  return { kind: 'architecture', plan: parseArchlensArgv(argv) };
}

export function skipUpdateCheck(argv: string[]): boolean {
  return argv.includes('--no-update-check');
}

/** True when the user invoked the non-interactive `scan` subcommand or `--scan` flag. */
export function isScanArgv(argv: string[]): boolean {
  return argv[0] === 'scan' || argv.includes('--scan');
}

function stripScanTokens(argv: string[]): string[] {
  const withoutSubcommand = argv[0] === 'scan' ? argv.slice(1) : argv;
  return withoutSubcommand.filter(arg => arg !== '--scan');
}

/** True when only enriching existing blueprint YAML (externals pass, no source scan). */
export function isEnrichArgv(argv: string[]): boolean {
  return argv[0] === 'enrich' || argv.includes('--enrich-only');
}

function stripEnrichTokens(argv: string[]): string[] {
  const withoutSubcommand = argv[0] === 'enrich' ? argv.slice(1) : argv;
  return withoutSubcommand.filter(arg => arg !== '--enrich-only');
}

function normalizeCommandArgv(argv: string[]): string[] {
  return stripEnrichTokens(stripScanTokens(argv));
}

export function isHeadlessArgv(argv: string[]): boolean {
  const legacy = argv[0] === 'forensics';
  const gitOnly = argv.includes('--git-only') || legacy;
  const forceInteractive =
    process.env.ARCHLENS_INTERACTIVE === '1' || process.env.ARCHLENS_INTERACTIVE === 'true';

  return (
    isScanArgv(argv) ||
    isEnrichArgv(argv) ||
    argv.includes('--headless') ||
    gitOnly ||
    !!flagValue(argv, '--parser') ||
    !!flagValue(argv, '--glob') ||
    !!flagValue(argv, '--output') ||
    !!flagValue(argv, '--context') ||
    !!flagValue(argv, '--system-name') ||
    argv.includes('--rollup-modules') ||
    parseCsv(flagValue(argv, '--ignore')).length > 0 ||
    !!flagValue(argv, '--systems') ||
    (!forceInteractive && !process.stdout.isTTY) ||
    (!forceInteractive && !!process.env.CI)
  );
}

/**
 * Parse unified ArchLens argv (architecture + git forensics enrich by default).
 * Legacy `forensics …` maps to headless architecture + forensics attach.
 * Pass `--no-git` to skip forensics enrichment.
 */
export function parseArchlensArgv(argv: string[]): ArchlensCliPlan {
  const rawArgv = isUpdateSubcommand(argv) ? argv.slice(1) : argv;
  const scanMode = isScanArgv(rawArgv);
  const enrichMode = isEnrichArgv(rawArgv);
  const commandArgv = normalizeCommandArgv(rawArgv);
  const legacy = commandArgv[0] === 'forensics';
  const legacyRest = legacy ? commandArgv.slice(1) : commandArgv;

  const noGit = commandArgv.includes('--no-git');
  const gitDecisionExplicit = scanMode || enrichMode || hasExplicitGitDecision(commandArgv);

  const sinceFromGit =
    flagValue(commandArgv, '--git-since') ??
    (legacy ? flagValue(legacyRest, '--since') : undefined);

  const architecture: ArchitectureCliFlags = {
    parserType: flagValue(commandArgv, '--parser'),
    glob: flagValue(commandArgv, '--glob'),
    outputDir: flagValue(commandArgv, '--output'),
    context: flagValue(commandArgv, '--context'),
    systemName: flagValue(commandArgv, '--system-name'),
    rollupModules: commandArgv.includes('--rollup-modules'),
    ignore: parseCsv(flagValue(commandArgv, '--ignore')),
    systems: (() => {
      const raw = flagValue(commandArgv, '--systems');
      return raw ? parseCsv(raw) : undefined;
    })(),
  };

  const git: GitForensicsCliFlags = {
    sinceDays: parseSinceDays(sinceFromGit),
    maxCouplingCommitFiles: parseNonNegativeInt(
      flagValue(commandArgv, '--max-coupling-commit-files')
    ),
    glob:
      flagValue(commandArgv, '--glob') ?? (legacy ? flagValue(legacyRest, '--glob') : undefined),
    ignore: parseCsv(
      flagValue(commandArgv, '--ignore') ?? (legacy ? flagValue(legacyRest, '--ignore') : undefined)
    ),
    targetPath: '.',
  };

  const isHeadless = scanMode || enrichMode || isHeadlessArgv(commandArgv);
  const publishAfterScan = commandArgv.includes('--publish');
  const publishSkipValidation = resolvePublishSkipValidation(commandArgv);

  return {
    isHeadless,
    runArchitecture: !enrichMode,
    runEnrichOnly: enrichMode,
    runGitForensics: enrichMode ? commandArgv.includes('--git') : !noGit,
    publishAfterScan,
    publishSkipValidation,
    publishKeyPrefix: flagValue(commandArgv, '--key-prefix'),
    publishWorkspaceName: flagValue(commandArgv, '--workspace-name'),
    gitDecisionExplicit,
    watch: commandArgv.includes('--watch'),
    watchDebounceMs: parseWatchDebounce(commandArgv),
    architecture,
    git,
  };
}
