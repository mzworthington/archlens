import {
  flagValue,
  parseOutputFormat,
  parsePositiveInt,
  parseResilienceOutputFormat,
  parseSlaThreshold,
  parseStorageProvider,
  positionalArgs,
  resolvePublishSkipValidation,
  type OutputFormat,
  type ResilienceOutputFormat,
} from './argvFlags.ts';

export interface ValidateCliPlan {
  targetPath: string;
  format: OutputFormat;
  /**
   * Also run BlueprintSpec contract checks (schema parse, entityRef wiring).
   * Default validate is architecture health only (cycles + forensics actions).
   */
  includeContract: boolean;
  /** Explicit baseline blueprint tree for deterioration compare. */
  baselinePath?: string;
  /** Git commit/ref to materialize as the health baseline (default HEAD~1 when flag bare). */
  sinceCommit?: string;
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

export function parseValidateArgv(argv: string[]): ValidateCliPlan {
  const rest = argv[0] === 'validate' ? argv.slice(1) : argv;
  const positional = positionalArgs(rest);
  const targetPath = flagValue(rest, '--path') ?? positional[0] ?? 'blueprints';
  const sinceCommitFlag =
    rest.includes('--since-commit') || rest.some(arg => arg.startsWith('--since-commit='));
  const sinceCommitRaw = flagValue(rest, '--since-commit');
  return {
    targetPath,
    format: parseOutputFormat(rest),
    includeContract: rest.includes('--contract'),
    baselinePath: flagValue(rest, '--baseline') || undefined,
    sinceCommit: sinceCommitRaw ?? (sinceCommitFlag ? 'HEAD~1' : undefined),
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
