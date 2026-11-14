import { DEFAULT_SCAN_GLOB } from '@archlens/analysis/options';
import pc from 'picocolors';

export type OutputFormat = 'text' | 'json';
/** Resilience supports YAML for human-readable artifacts; CI keeps JSON. */
export type ResilienceOutputFormat = OutputFormat | 'yaml';

export function defaultEstateKeyPrefix(estateId: string): string {
  let trimmed = estateId;
  while (trimmed.startsWith('/')) trimmed = trimmed.slice(1);
  while (trimmed.endsWith('/')) trimmed = trimmed.slice(0, -1);
  return `estates/${trimmed}`;
}

export interface ArchitectureCliFlags {
  parserType: string | undefined;
  glob: string | undefined;
  outputDir: string | undefined;
  context: string | undefined;
  systemName: string | undefined;
  rollupModules: boolean;
  failOnCycles?: boolean;
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

export const FLAG = {
  help: '--help',
  helpShort: '-h',
  version: '--version',
  versionShort: '-V',
  headless: '--headless',
  scan: '--scan',
  enrichOnly: '--enrich-only',
  parser: '--parser',
  glob: '--glob',
  output: '--output',
  context: '--context',
  systemName: '--system-name',
  rollupModules: '--rollup-modules',
  failOnCycles: '--fail-on-cycles',
  ignore: '--ignore',
  systems: '--systems',
  git: '--git',
  noGit: '--no-git',
  gitOnly: '--git-only',
  gitSince: '--git-since',
  maxCouplingCommitFiles: '--max-coupling-commit-files',
  publish: '--publish',
  skipValidation: '--skip-validation',
  validate: '--validate',
  keyPrefix: '--key-prefix',
  workspaceName: '--workspace-name',
  watch: '--watch',
  watchDebounce: '--watch-debounce',
  noUpdateCheck: '--no-update-check',
} as const;

type HelpRow = { label: string; summary: string };

type ArchitectureFlag = {
  names: readonly string[];
  overview?: HelpRow;
  scan?: HelpRow;
};

const ARCHITECTURE_FLAGS: readonly ArchitectureFlag[] = [
  {
    names: [FLAG.help, FLAG.helpShort],
    overview: { label: '--help, -h', summary: 'Show help' },
  },
  {
    names: [FLAG.version, FLAG.versionShort],
    overview: { label: '--version, -V', summary: 'Print version' },
  },
  {
    names: [FLAG.headless],
    overview: { label: '--headless', summary: 'Skip interactive prompts' },
    scan: { label: '--headless', summary: 'Same as scan - never prompts' },
  },
  {
    names: [FLAG.scan],
    scan: { label: '--scan', summary: 'Headless scan (same as the scan command)' },
  },
  {
    names: [FLAG.enrichOnly],
    overview: { label: '--enrich-only', summary: 'Externals-only pass (same as enrich)' },
  },
  {
    names: [FLAG.glob],
    overview: {
      label: '--glob=<pattern>',
      summary: `Source files to scan (default: ${DEFAULT_SCAN_GLOB})`,
    },
    scan: {
      label: '--glob=<pattern>',
      summary: `Files to analyze (default: ${DEFAULT_SCAN_GLOB})`,
    },
  },
  {
    names: [FLAG.output],
    overview: { label: '--output=<dir>', summary: 'Blueprint output folder (default: blueprints)' },
    scan: { label: '--output=<dir>', summary: 'Write YAML under this folder' },
  },
  {
    names: [FLAG.context],
    overview: { label: '--context=<name>', summary: 'Root entityRef slug (default: blueprint)' },
    scan: { label: '--context=<name>', summary: 'Context diagram root name / entityRef' },
  },
  {
    names: [FLAG.systemName],
    overview: {
      label: '--system-name=<name>',
      summary: 'Software system for this repo (multi-repo products)',
    },
    scan: {
      label: '--system-name=<name>',
      summary: 'Name this repo on the context diagram (multi-repo products)',
    },
  },
  {
    names: [FLAG.parser],
    scan: {
      label: '--parser=tree-sitter|ts-morph',
      summary: 'AST engine (default: tree-sitter; ts-morph = TypeScript-only opt-in)',
    },
  },
  {
    names: [FLAG.rollupModules],
    scan: {
      label: '--rollup-modules',
      summary: 'Collapse *-module-* packages into prefix systems',
    },
  },
  {
    names: [FLAG.failOnCycles],
    scan: {
      label: '--fail-on-cycles',
      summary: 'Exit non-zero if scanned blueprints contain dependency cycles',
    },
  },
  {
    names: [FLAG.ignore],
    scan: { label: '--ignore=<a,b>', summary: 'Extra ignore globs (comma-separated)' },
  },
  {
    names: [FLAG.systems],
    scan: { label: '--systems=<a,b>', summary: 'Restrict discovery to these roots' },
  },
  {
    names: [FLAG.publish],
    overview: {
      label: '--publish',
      summary: 'After scan, upload output tree to object storage (--no-dry-run)',
    },
    scan: {
      label: '--publish',
      summary: 'Upload output tree to object storage after a successful scan',
    },
  },
  {
    names: [FLAG.keyPrefix],
    overview: {
      label: '--key-prefix=<path>',
      summary:
        'With --publish: object key prefix (or OBJECT_STORAGE_KEY_PREFIX; samples estate: estates/{id}/)',
    },
    scan: {
      label: '--key-prefix=<path>',
      summary:
        'With --publish: object key prefix inside the bucket (isolates catalogs; see ADR-0014)',
    },
  },
  {
    names: [FLAG.workspaceName],
    overview: {
      label: '--workspace-name=<name>',
      summary: 'With --publish: workspace name for entityRef resolution',
    },
    scan: {
      label: '--workspace-name=<name>',
      summary: 'With --publish: workspace name for entityRef resolution',
    },
  },
  {
    names: [FLAG.skipValidation],
    overview: {
      label: '--skip-validation',
      summary:
        'With --publish: allow upload without a validation gate (default; use --validate to gate)',
    },
    scan: {
      label: '--skip-validation',
      summary:
        'Allow upload without a validation gate (default; catalogs prefer visibility over blocking)',
    },
  },
  {
    names: [FLAG.validate],
    overview: {
      label: '--validate',
      summary: 'With --publish: fail upload when workspace validation fails',
    },
    scan: {
      label: '--validate',
      summary: 'Fail publish when workspace validation fails (optional hard gate)',
    },
  },
  {
    names: [FLAG.noGit],
    overview: { label: '--no-git', summary: 'Skip TraceLens git forensics enrichment' },
    scan: { label: '--no-git', summary: 'Structure-only scan (no TraceLens blocks)' },
  },
  {
    names: [FLAG.git, FLAG.gitSince],
    overview: {
      label: '--git --git-since=<days>',
      summary: 'Enable forensics with lookback window',
    },
    scan: { label: '--git --git-since=<days>', summary: 'Attach git forensics (default on)' },
  },
  {
    names: [FLAG.gitOnly],
    overview: { label: '--git-only', summary: 'Headless architecture plus forensics enrich' },
  },
  {
    names: [FLAG.maxCouplingCommitFiles],
    scan: {
      label: '--max-coupling-commit-files=<n>',
      summary: 'Cap files per commit when scoring coupling',
    },
  },
  {
    names: [FLAG.watch, FLAG.watchDebounce],
    overview: { label: '--watch', summary: 'Re-run when source files change' },
    scan: { label: '--watch [--watch-debounce=<ms>]', summary: 'Re-run on file changes' },
  },
  {
    names: [FLAG.noUpdateCheck],
    overview: { label: '--no-update-check', summary: 'Skip startup update prompt' },
  },
];

export function architectureFlagNames(): Set<string> {
  return new Set(ARCHITECTURE_FLAGS.flatMap(flag => flag.names));
}

export function helpRowsFor(topic: 'overview' | 'scan'): HelpRow[] {
  return ARCHITECTURE_FLAGS.flatMap(flag => {
    const row = flag[topic];
    return row ? [row] : [];
  });
}

function stripAnsi(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 0x1b && text[i + 1] === '[') {
      i += 2;
      while (i < text.length && text[i] !== 'm') {
        i += 1;
      }
      continue;
    }
    out += text[i];
  }
  return out;
}

export function extractFlagNamesFromText(text: string): Set<string> {
  const stripped = stripAnsi(text);
  const names = new Set<string>();
  for (const line of stripped.split('\n')) {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith('-')) {
      continue;
    }
    const gap = trimmed.search(/\s{2,}/);
    const namePart = gap === -1 ? trimmed.slice(0, 40) : trimmed.slice(0, gap);
    for (const match of namePart.matchAll(/--[a-z][a-z0-9-]*/g)) {
      names.add(match[0]!);
    }
    if (/(?:^|[\s,])-h(?:\s|$|,)/.test(namePart)) {
      names.add('-h');
    }
    if (/(?:^|[\s,])-V(?:\s|$|,)/.test(namePart)) {
      names.add('-V');
    }
  }
  return names;
}

function isArchitectureArgv(argv: string[]): boolean {
  const first = argv[0];
  return (
    !first || first.startsWith('-') || first === 'scan' || first === 'enrich' || first === 'update'
  );
}

export function assertKnownFlags(argv: string[]): void {
  if (!isArchitectureArgv(argv)) return;
  const rest =
    argv[0] === 'scan' || argv[0] === 'enrich' || argv[0] === 'update' ? argv.slice(1) : argv;
  const known = architectureFlagNames();
  for (const arg of rest) {
    if (!arg.startsWith('-')) continue;
    const name = arg.split('=')[0]!;
    if (known.has(name)) continue;
    console.error('');
    console.error(`${pc.red('✖')} ${pc.bold(pc.red(`Unknown flag: ${name}`))}`);
    console.error(`  ${pc.dim('Run')} ${pc.white('archlens help')} ${pc.dim('for usage.')}`);
    console.error('');
    process.exit(1);
  }
}
