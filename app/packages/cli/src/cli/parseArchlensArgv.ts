import {
  DEFAULT_WATCH_DEBOUNCE_MS,
  defaultEstateKeyPrefix,
  flagValue,
  parseCsv,
  parseNonNegativeInt,
  parseSinceDays,
  parseWatchDebounce,
  resolvePublishSkipValidation,
  type OutputFormat,
  type ResilienceOutputFormat,
} from './argvFlags.ts';
import {
  parseCatalogAcceptOverlayArgv,
  parseCatalogComposeArgv,
  parseCatalogPruneArgv,
  parseCatalogPublishFragmentArgv,
  parseCatalogRejectOverlayArgv,
  type CatalogAcceptOverlayCliPlan,
  type CatalogComposeCliPlan,
  type CatalogPruneCliPlan,
  type CatalogPublishFragmentCliPlan,
  type CatalogRejectOverlayCliPlan,
} from './catalogArgv.ts';
import {
  parseDiffArgv,
  parsePublishArgv,
  parseResilienceArgv,
  parseValidateArgv,
  type DiffCliPlan,
  type PublishCliPlan,
  type ResilienceCliPlan,
  type ValidateCliPlan,
} from './subcommandArgv.ts';

export type { OutputFormat, ResilienceOutputFormat };
export { DEFAULT_WATCH_DEBOUNCE_MS, defaultEstateKeyPrefix, resolvePublishSkipValidation };

export type {
  CatalogAcceptOverlayCliPlan,
  CatalogComposeCliPlan,
  CatalogPruneCliPlan,
  CatalogPublishFragmentCliPlan,
  CatalogRejectOverlayCliPlan,
};
export {
  parseCatalogAcceptOverlayArgv,
  parseCatalogComposeArgv,
  parseCatalogPruneArgv,
  parseCatalogPublishFragmentArgv,
  parseCatalogRejectOverlayArgv,
};

export type { DiffCliPlan, PublishCliPlan, ResilienceCliPlan, ValidateCliPlan };
export { parseDiffArgv, parsePublishArgv, parseResilienceArgv, parseValidateArgv };

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

export type ArchlensCommandPlan =
  | { kind: 'architecture'; plan: ArchlensCliPlan }
  | { kind: 'validate'; plan: ValidateCliPlan }
  | { kind: 'diff'; plan: DiffCliPlan }
  | { kind: 'resilience'; plan: ResilienceCliPlan }
  | { kind: 'publish'; plan: PublishCliPlan }
  | { kind: 'catalog-compose'; plan: CatalogComposeCliPlan }
  | { kind: 'catalog-publish-fragment'; plan: CatalogPublishFragmentCliPlan }
  | { kind: 'catalog-accept-overlay'; plan: CatalogAcceptOverlayCliPlan }
  | { kind: 'catalog-reject-overlay'; plan: CatalogRejectOverlayCliPlan }
  | { kind: 'catalog-prune'; plan: CatalogPruneCliPlan };

function hasExplicitGitDecision(argv: string[]): boolean {
  return (
    argv.includes('--git') ||
    argv.includes('--no-git') ||
    argv.includes('--git-only') ||
    argv.some(a => a.startsWith('--git-since')) ||
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
    if (action === 'prune') {
      return { kind: 'catalog-prune', plan: parseCatalogPruneArgv(argv) };
    }
    throw new Error(
      `Unknown catalog action "${action ?? ''}". Use: archlens catalog compose | publish-fragment | accept-overlay | reject-overlay | prune`
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
  const forceInteractive =
    process.env.ARCHLENS_INTERACTIVE === '1' || process.env.ARCHLENS_INTERACTIVE === 'true';

  return (
    isScanArgv(argv) ||
    isEnrichArgv(argv) ||
    argv.includes('--headless') ||
    argv.includes('--git-only') ||
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
 * Pass `--no-git` to skip forensics enrichment.
 */
export function parseArchlensArgv(argv: string[]): ArchlensCliPlan {
  const rawArgv = isUpdateSubcommand(argv) ? argv.slice(1) : argv;
  const scanMode = isScanArgv(rawArgv);
  const enrichMode = isEnrichArgv(rawArgv);
  const commandArgv = normalizeCommandArgv(rawArgv);

  const noGit = commandArgv.includes('--no-git');
  const gitDecisionExplicit = scanMode || enrichMode || hasExplicitGitDecision(commandArgv);

  const sinceFromGit = flagValue(commandArgv, '--git-since');

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
    glob: flagValue(commandArgv, '--glob'),
    ignore: parseCsv(flagValue(commandArgv, '--ignore')),
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
