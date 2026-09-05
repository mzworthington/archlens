import pc from 'picocolors';
import { DEFAULT_SCAN_GLOB } from '@archlens/analysis/options';

export const HELP_TOPICS = [
  'overview',
  'scan',
  'enrich',
  'validate',
  'diff',
  'resilience',
  'publish',
  'catalog',
  'update',
] as const;

export type HelpTopic = (typeof HELP_TOPICS)[number];

export const HELP_SECTION = {
  common: 'COMMON FLAGS',
  options: 'OPTIONS',
  fragment: 'publish-fragment OPTIONS',
  compose: 'compose OPTIONS',
  prune: 'prune OPTIONS',
  overlay: 'accept-overlay / reject-overlay OPTIONS',
} as const;

export const FLAG = {
  help: '--help',
  helpShort: '-h',
  version: '--version',
  versionShort: '-V',
  noUpdateCheck: '--no-update-check',
  headless: '--headless',
  glob: '--glob',
  output: '--output',
  context: '--context',
  systemName: '--system-name',
  parser: '--parser',
  rollupModules: '--rollup-modules',
  ignore: '--ignore',
  systems: '--systems',
  publish: '--publish',
  keyPrefix: '--key-prefix',
  workspaceName: '--workspace-name',
  skipValidation: '--skip-validation',
  validate: '--validate',
  noGit: '--no-git',
  git: '--git',
  gitSince: '--git-since',
  gitOnly: '--git-only',
  maxCouplingCommitFiles: '--max-coupling-commit-files',
  watch: '--watch',
  watchDebounce: '--watch-debounce',
  scan: '--scan',
  enrichOnly: '--enrich-only',
  path: '--path',
  format: '--format',
  contract: '--contract',
  sinceCommit: '--since-commit',
  baseline: '--baseline',
  current: '--current',
  chaosSpecs: '--chaos-specs',
  minSla: '--min-sla',
  failOnRecommendations: '--fail-on-recommendations',
  maxRegionOutages: '--max-region-outages',
  maxFanInProbes: '--max-fan-in-probes',
  provider: '--provider',
  bucket: '--bucket',
  accountId: '--account-id',
  noDryRun: '--no-dry-run',
  estate: '--estate',
  product: '--product',
  productId: '--product-id',
  system: '--system',
  systemId: '--system-id',
  fragmentKey: '--fragment-key',
  sourceRef: '--source-ref',
  runId: '--run-id',
  maxRetries: '--max-retries',
  allowEmpty: '--allow-empty',
  keepSnapshots: '--keep-snapshots',
  keepSnapshotDays: '--keep-snapshot-days',
  keepFragmentRuns: '--keep-fragment-runs',
  file: '--file',
  overlayId: '--overlay-id',
  overlayIdAlias: '--id',
} as const;

interface CliFlagHelpLine {
  topic: HelpTopic;
  section: string;
  helpName: string;
  summary: string;
}

interface CliFlagSpec {
  name: string;
  aliases?: readonly string[];
  help: readonly CliFlagHelpLine[];
}

function line(
  topic: HelpTopic,
  section: string,
  helpName: string,
  summary: string
): CliFlagHelpLine {
  return { topic, section, helpName, summary };
}

const COMMON = HELP_SECTION.common;
const OPTIONS = HELP_SECTION.options;

const CLI_FLAG_CATALOG: readonly CliFlagSpec[] = [
  {
    name: FLAG.help,
    aliases: [FLAG.helpShort],
    help: [line('overview', COMMON, '--help, -h', 'Show help')],
  },
  {
    name: FLAG.version,
    aliases: [FLAG.versionShort],
    help: [line('overview', COMMON, '--version, -V', 'Print version')],
  },
  {
    name: FLAG.noUpdateCheck,
    help: [
      line('overview', COMMON, '--no-update-check', 'Skip startup update prompt'),
      line(
        'update',
        OPTIONS,
        '--no-update-check',
        'Skip the interactive startup update prompt on other commands'
      ),
    ],
  },
  {
    name: FLAG.headless,
    help: [
      line('overview', COMMON, '--headless', 'Skip interactive prompts'),
      line('scan', OPTIONS, '--headless', 'Same as scan - never prompts'),
    ],
  },
  {
    name: FLAG.scan,
    help: [line('scan', OPTIONS, '--scan', 'Same as the scan subcommand')],
  },
  {
    name: FLAG.enrichOnly,
    help: [line('enrich', OPTIONS, '--enrich-only', 'Same as the enrich subcommand')],
  },
  {
    name: FLAG.glob,
    help: [
      line(
        'overview',
        COMMON,
        '--glob=<pattern>',
        `Source files to scan (default: ${DEFAULT_SCAN_GLOB})`
      ),
      line('scan', OPTIONS, '--glob=<pattern>', `Files to analyze (default: ${DEFAULT_SCAN_GLOB})`),
    ],
  },
  {
    name: FLAG.output,
    help: [
      line('overview', COMMON, '--output=<dir>', 'Blueprint output folder (default: blueprints)'),
      line('scan', OPTIONS, '--output=<dir>', 'Write YAML under this folder'),
      line('enrich', OPTIONS, '--output=<dir>', 'Blueprint folder (default: blueprints)'),
      line(
        'resilience',
        OPTIONS,
        '--output=<file>',
        'Write AdviceLens artifact to a file (.json or .yaml)'
      ),
    ],
  },
  {
    name: FLAG.context,
    help: [
      line('overview', COMMON, '--context=<name>', 'Root entityRef slug (default: blueprint)'),
      line('scan', OPTIONS, '--context=<name>', 'Context diagram root name / entityRef'),
    ],
  },
  {
    name: FLAG.systemName,
    help: [
      line(
        'overview',
        COMMON,
        '--system-name=<name>',
        'Software system for this repo (multi-repo products)'
      ),
      line(
        'scan',
        OPTIONS,
        '--system-name=<name>',
        'Name this repo on the context diagram (multi-repo products)'
      ),
    ],
  },
  {
    name: FLAG.parser,
    help: [
      line(
        'scan',
        OPTIONS,
        '--parser=tree-sitter|ts-morph',
        'AST engine (default: tree-sitter; ts-morph = TypeScript-only opt-in)'
      ),
    ],
  },
  {
    name: FLAG.rollupModules,
    help: [
      line('scan', OPTIONS, '--rollup-modules', 'Collapse *-module-* packages into prefix systems'),
    ],
  },
  {
    name: FLAG.ignore,
    help: [line('scan', OPTIONS, '--ignore=<a,b>', 'Extra ignore globs (comma-separated)')],
  },
  {
    name: FLAG.systems,
    help: [line('scan', OPTIONS, '--systems=<a,b>', 'Restrict discovery to these roots')],
  },
  {
    name: FLAG.noGit,
    help: [
      line('overview', COMMON, '--no-git', 'Skip TraceLens git forensics enrichment'),
      line('scan', OPTIONS, '--no-git', 'Structure-only scan (no TraceLens blocks)'),
    ],
  },
  {
    name: FLAG.git,
    help: [
      line('overview', COMMON, '--git', 'Enable forensics (on by default for scan)'),
      line('scan', OPTIONS, '--git', 'Attach git forensics (default on)'),
      line('enrich', OPTIONS, '--git', 'Also refresh TraceLens git metrics on nodes'),
    ],
  },
  {
    name: FLAG.gitSince,
    help: [
      line('overview', COMMON, '--git-since=<days>', 'Forensics lookback window'),
      line('scan', OPTIONS, '--git-since=<days>', 'Forensics lookback when git is enabled'),
      line('enrich', OPTIONS, '--git-since=<days>', 'Forensics lookback when --git is set'),
    ],
  },
  {
    name: FLAG.gitOnly,
    help: [line('scan', OPTIONS, '--git-only', 'Headless architecture plus forensics enrich')],
  },
  {
    name: FLAG.maxCouplingCommitFiles,
    help: [
      line(
        'scan',
        OPTIONS,
        '--max-coupling-commit-files=<n>',
        'Skip temporal coupling for commits touching more than N files'
      ),
    ],
  },
  {
    name: FLAG.publish,
    help: [
      line(
        'overview',
        COMMON,
        '--publish',
        'After scan, upload output tree to object storage (--no-dry-run)'
      ),
      line(
        'scan',
        OPTIONS,
        '--publish',
        'Upload output tree to object storage after a successful scan'
      ),
    ],
  },
  {
    name: FLAG.keyPrefix,
    help: [
      line(
        'overview',
        COMMON,
        '--key-prefix=<path>',
        'With --publish: object key prefix (or OBJECT_STORAGE_KEY_PREFIX; samples estate: estates/{id}/)'
      ),
      line(
        'scan',
        OPTIONS,
        '--key-prefix=<path>',
        'With --publish: object key prefix inside the bucket (isolates catalogs; see ADR-0014)'
      ),
      line(
        'publish',
        OPTIONS,
        '--key-prefix=<path>',
        'Object key prefix inside the bucket (or OBJECT_STORAGE_KEY_PREFIX; samples estate: estates/{id}/)'
      ),
      line(
        'catalog',
        HELP_SECTION.fragment,
        '--key-prefix=<path>',
        'Override object key prefix (default: estates/{estate}/)'
      ),
      line(
        'catalog',
        HELP_SECTION.compose,
        '--key-prefix=<path>',
        'Override object key prefix (default: estates/{estate}/)'
      ),
      line(
        'catalog',
        HELP_SECTION.prune,
        '--key-prefix=<path>',
        'Override object key prefix (default: estates/{estate}/)'
      ),
      line(
        'catalog',
        HELP_SECTION.overlay,
        '--key-prefix=<path>',
        'Override object key prefix (default: estates/{estate}/)'
      ),
    ],
  },
  {
    name: FLAG.workspaceName,
    help: [
      line(
        'overview',
        COMMON,
        '--workspace-name=<name>',
        'With --publish: workspace name for entityRef resolution'
      ),
      line(
        'scan',
        OPTIONS,
        '--workspace-name=<name>',
        'With --publish: workspace name for entityRef resolution'
      ),
      line(
        'publish',
        OPTIONS,
        '--workspace-name=<name>',
        'Workspace name for entityRef resolution (default: blueprints)'
      ),
      line(
        'catalog',
        HELP_SECTION.compose,
        '--workspace-name=<name>',
        'Workspace name for validation / catalog'
      ),
    ],
  },
  {
    name: FLAG.skipValidation,
    help: [
      line(
        'overview',
        COMMON,
        '--skip-validation',
        'With --publish: allow upload without a validation gate (default; use --validate to gate)'
      ),
      line(
        'scan',
        OPTIONS,
        '--skip-validation',
        'Allow upload without a validation gate (default; catalogs prefer visibility over blocking)'
      ),
      line(
        'publish',
        OPTIONS,
        '--skip-validation',
        'Allow upload without a validation gate (default; use --validate to gate)'
      ),
      line(
        'catalog',
        HELP_SECTION.fragment,
        '--skip-validation',
        'Allow upload without a validation gate (default; use --validate to gate)'
      ),
      line(
        'catalog',
        HELP_SECTION.compose,
        '--skip-validation',
        'Allow compose without a validation gate (default; use --validate to gate)'
      ),
    ],
  },
  {
    name: FLAG.validate,
    help: [
      line(
        'overview',
        COMMON,
        '--validate',
        'With --publish: fail upload when workspace validation fails'
      ),
      line(
        'scan',
        OPTIONS,
        '--validate',
        'Fail publish when workspace validation fails (optional hard gate)'
      ),
      line('publish', OPTIONS, '--validate', 'Fail publish when workspace validation fails'),
      line(
        'catalog',
        HELP_SECTION.fragment,
        '--validate',
        'Fail fragment publish when workspace validation fails'
      ),
      line(
        'catalog',
        HELP_SECTION.compose,
        '--validate',
        'Fail compose when the composed tree fails validation'
      ),
    ],
  },
  {
    name: FLAG.watch,
    help: [
      line('overview', COMMON, '--watch', 'Re-run when source files change'),
      line('scan', OPTIONS, '--watch', 'Re-run on file changes'),
    ],
  },
  {
    name: FLAG.watchDebounce,
    help: [
      line(
        'scan',
        OPTIONS,
        '--watch-debounce=<ms>',
        'Debounce file changes before re-run (default 500)'
      ),
    ],
  },
  {
    name: FLAG.path,
    help: [
      line('validate', OPTIONS, '--path=<dir>', 'Blueprint tree (default: blueprints)'),
      line('resilience', OPTIONS, '--path=<dir>', 'Blueprint tree (default: blueprints)'),
      line('publish', OPTIONS, '--path=<dir>', 'Blueprint tree (default: blueprints)'),
      line(
        'catalog',
        HELP_SECTION.fragment,
        '--path=<dir>',
        'Blueprint tree (default: blueprints)'
      ),
    ],
  },
  {
    name: FLAG.format,
    help: [
      line('validate', OPTIONS, '--format=text|json', 'Output format (default: text)'),
      line('diff', OPTIONS, '--format=text|json', 'Output format (default: text)'),
      line(
        'resilience',
        OPTIONS,
        '--format=text|json|yaml',
        'Output format (default: text; CI uses json)'
      ),
      line('publish', OPTIONS, '--format=text|json', 'Output format (default: text)'),
      line('catalog', HELP_SECTION.compose, '--format=text|json', 'Output format (default: text)'),
      line('catalog', HELP_SECTION.prune, '--format=text|json', 'Output format (default: text)'),
      line('catalog', HELP_SECTION.overlay, '--format=text|json', 'Output format (default: text)'),
    ],
  },
  {
    name: FLAG.contract,
    help: [
      line('validate', OPTIONS, '--contract', 'Also fail on BlueprintSpec wiring/schema issues'),
    ],
  },
  {
    name: FLAG.sinceCommit,
    help: [
      line(
        'validate',
        OPTIONS,
        '--since-commit[=<ref>]',
        'Compare health to blueprints at git ref (default HEAD~1)'
      ),
    ],
  },
  {
    name: FLAG.baseline,
    help: [
      line(
        'validate',
        OPTIONS,
        '--baseline=<dir>',
        'Compare health to another on-disk blueprint tree'
      ),
      line('diff', OPTIONS, '--baseline=<dir>', 'Baseline tree (default: blueprints)'),
    ],
  },
  {
    name: FLAG.current,
    help: [line('diff', OPTIONS, '--current=<dir>', 'Current tree (default: same as baseline)')],
  },
  {
    name: FLAG.chaosSpecs,
    help: [
      line(
        'resilience',
        OPTIONS,
        '--chaos-specs=<dir>',
        'Optional ChaosSpec YAML directory (e.g. chaos-specs/)'
      ),
    ],
  },
  {
    name: FLAG.minSla,
    help: [
      line(
        'resilience',
        OPTIONS,
        '--min-sla=<percent>',
        'Exit 1 when worst SLA falls below threshold (default: 100)'
      ),
    ],
  },
  {
    name: FLAG.failOnRecommendations,
    help: [
      line(
        'resilience',
        OPTIONS,
        '--fail-on-recommendations',
        'Exit 1 when any recommendation is emitted'
      ),
    ],
  },
  {
    name: FLAG.maxRegionOutages,
    help: [
      line(
        'resilience',
        OPTIONS,
        '--max-region-outages=<n>',
        'Cap region-outage scenarios per diagram (default: 15)'
      ),
    ],
  },
  {
    name: FLAG.maxFanInProbes,
    help: [
      line(
        'resilience',
        OPTIONS,
        '--max-fan-in-probes=<n>',
        'Cap fan-in latency probes per diagram (default: 5)'
      ),
    ],
  },
  {
    name: FLAG.provider,
    help: [
      line(
        'publish',
        OPTIONS,
        '--provider=r2|s3|azure',
        'Object storage provider (default: OBJECT_STORAGE_PROVIDER or r2)'
      ),
      line(
        'catalog',
        HELP_SECTION.fragment,
        '--provider=r2|s3|azure',
        'Object storage provider (default: OBJECT_STORAGE_PROVIDER or r2)'
      ),
      line(
        'catalog',
        HELP_SECTION.compose,
        '--provider=r2|s3|azure',
        'Object storage provider (default: OBJECT_STORAGE_PROVIDER or r2)'
      ),
      line(
        'catalog',
        HELP_SECTION.prune,
        '--provider=r2|s3|azure',
        'Object storage provider (default: OBJECT_STORAGE_PROVIDER or r2)'
      ),
      line(
        'catalog',
        HELP_SECTION.overlay,
        '--provider=r2|s3|azure',
        'Object storage provider (default: OBJECT_STORAGE_PROVIDER or r2)'
      ),
    ],
  },
  {
    name: FLAG.bucket,
    help: [
      line(
        'publish',
        OPTIONS,
        '--bucket=<name>',
        'Bucket/container (default: OBJECT_STORAGE_BUCKET / R2_BUCKET env)'
      ),
      line(
        'catalog',
        HELP_SECTION.fragment,
        '--bucket=<name>',
        'Bucket/container (default: OBJECT_STORAGE_BUCKET / R2_BUCKET env)'
      ),
      line(
        'catalog',
        HELP_SECTION.compose,
        '--bucket=<name>',
        'Bucket/container (default: OBJECT_STORAGE_BUCKET / R2_BUCKET env)'
      ),
      line(
        'catalog',
        HELP_SECTION.prune,
        '--bucket=<name>',
        'Bucket/container (default: OBJECT_STORAGE_BUCKET / R2_BUCKET env)'
      ),
      line(
        'catalog',
        HELP_SECTION.overlay,
        '--bucket=<name>',
        'Bucket/container (default: OBJECT_STORAGE_BUCKET / R2_BUCKET env)'
      ),
    ],
  },
  {
    name: FLAG.accountId,
    help: [
      line(
        'publish',
        OPTIONS,
        '--account-id=<id>',
        'Cloudflare account id for R2 endpoint override'
      ),
      line(
        'catalog',
        HELP_SECTION.fragment,
        '--account-id=<id>',
        'Cloudflare account id for R2 endpoint override'
      ),
      line(
        'catalog',
        HELP_SECTION.compose,
        '--account-id=<id>',
        'Cloudflare account id for R2 endpoint override'
      ),
      line(
        'catalog',
        HELP_SECTION.prune,
        '--account-id=<id>',
        'Cloudflare account id for R2 endpoint override'
      ),
      line(
        'catalog',
        HELP_SECTION.overlay,
        '--account-id=<id>',
        'Cloudflare account id for R2 endpoint override'
      ),
    ],
  },
  {
    name: FLAG.noDryRun,
    help: [
      line('publish', OPTIONS, '--no-dry-run', 'Upload snapshot to object storage'),
      line('catalog', HELP_SECTION.fragment, '--no-dry-run', 'Upload fragment to object storage'),
      line(
        'catalog',
        HELP_SECTION.compose,
        '--no-dry-run',
        'Upload composed snapshot and CAS-update latest'
      ),
      line(
        'catalog',
        HELP_SECTION.prune,
        '--no-dry-run',
        'Delete planned keys (default is dry-run)'
      ),
      line(
        'catalog',
        HELP_SECTION.overlay,
        '--no-dry-run',
        'Write overlay accept/reject to object storage'
      ),
    ],
  },
  {
    name: FLAG.estate,
    help: [
      line(
        'catalog',
        HELP_SECTION.fragment,
        '--estate=<id>',
        'Estate id (default key prefix estates/{id}/)'
      ),
      line(
        'catalog',
        HELP_SECTION.compose,
        '--estate=<id>',
        'Estate id to compose (loads fragments/ under the key prefix)'
      ),
      line(
        'catalog',
        HELP_SECTION.prune,
        '--estate=<id>',
        'Estate id (default key prefix estates/{id}/)'
      ),
      line(
        'catalog',
        HELP_SECTION.overlay,
        '--estate=<id>',
        'Estate id (default key prefix estates/{id}/)'
      ),
    ],
  },
  {
    name: FLAG.product,
    aliases: [FLAG.productId],
    help: [
      line(
        'catalog',
        HELP_SECTION.fragment,
        '--product=<id>, --product-id=<id>',
        'Product composition key'
      ),
    ],
  },
  {
    name: FLAG.system,
    aliases: [FLAG.systemId],
    help: [
      line(
        'catalog',
        HELP_SECTION.fragment,
        '--system=<id>, --system-id=<id>',
        'Optional system / path slice within the product'
      ),
    ],
  },
  {
    name: FLAG.fragmentKey,
    help: [
      line(
        'catalog',
        HELP_SECTION.fragment,
        '--fragment-key=<id>',
        'Override fragment key (default: product[--system])'
      ),
    ],
  },
  {
    name: FLAG.sourceRef,
    help: [
      line('catalog', HELP_SECTION.fragment, '--source-ref=<ref>', 'Repo@sha or CI run identity'),
    ],
  },
  {
    name: FLAG.runId,
    help: [
      line(
        'catalog',
        HELP_SECTION.fragment,
        '--run-id=<id>',
        'Optional run id (default: UTC timestamp)'
      ),
    ],
  },
  {
    name: FLAG.maxRetries,
    help: [
      line(
        'catalog',
        HELP_SECTION.compose,
        '--max-retries=<n>',
        'CAS retries on latest/manifest.json (default: 8)'
      ),
    ],
  },
  {
    name: FLAG.allowEmpty,
    help: [
      line(
        'catalog',
        HELP_SECTION.compose,
        '--allow-empty',
        'Exit 0 when no fragments are staged (cron safety nets)'
      ),
    ],
  },
  {
    name: FLAG.keepSnapshots,
    help: [
      line(
        'catalog',
        HELP_SECTION.prune,
        '--keep-snapshots=<n>',
        'Keep at least N newest snapshots (default: 7)'
      ),
    ],
  },
  {
    name: FLAG.keepSnapshotDays,
    help: [
      line(
        'catalog',
        HELP_SECTION.prune,
        '--keep-snapshot-days=<n>',
        'Also keep snapshots newer than N days (default: 14)'
      ),
    ],
  },
  {
    name: FLAG.keepFragmentRuns,
    help: [
      line(
        'catalog',
        HELP_SECTION.prune,
        '--keep-fragment-runs=<n>',
        'Keep N newest runs per fragment key (default: 2)'
      ),
    ],
  },
  {
    name: FLAG.file,
    help: [
      line(
        'catalog',
        HELP_SECTION.overlay,
        '--file=<overlay.yaml>',
        'accept-overlay: suggestion overlay document to stage'
      ),
    ],
  },
  {
    name: FLAG.overlayId,
    aliases: [FLAG.overlayIdAlias],
    help: [
      line(
        'catalog',
        HELP_SECTION.overlay,
        '--overlay-id=<id>, --id=<id>',
        'reject-overlay: overlay id to tombstone'
      ),
    ],
  },
];

export function catalogFlagNames(): string[] {
  const names = new Set<string>();
  for (const spec of CLI_FLAG_CATALOG) {
    names.add(spec.name);
    for (const alias of spec.aliases ?? []) names.add(alias);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function catalogHelpLines(topic: HelpTopic, section: string): readonly CliFlagHelpLine[] {
  const lines: CliFlagHelpLine[] = [];
  for (const spec of CLI_FLAG_CATALOG) {
    for (const help of spec.help) {
      if (help.topic === topic && help.section === section) lines.push(help);
    }
  }
  return lines;
}

const ANSI_ESCAPE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

export function extractCliFlagTokens(text: string): string[] {
  const plain = text.replace(ANSI_ESCAPE, '');
  const found = new Set<string>();
  for (const match of plain.matchAll(/(--[a-z][a-z0-9-]+|-[hV])\b/g)) {
    found.add(match[1]!);
  }
  return [...found].sort((a, b) => a.localeCompare(b));
}

export function unknownCliFlag(argv: string[]): string | undefined {
  const known = new Set(catalogFlagNames());
  for (const token of argv) {
    if (!token.startsWith('-')) continue;
    const name = token.split('=')[0]!;
    if (!known.has(name)) return name;
  }
  return undefined;
}

export function assertKnownCliFlags(argv: string[]): void {
  const unknown = unknownCliFlag(argv);
  if (!unknown) return;
  console.error('');
  console.error(`${pc.red('✖')} ${pc.bold(pc.red(`Unknown flag: ${unknown}`))}`);
  console.error(`  ${pc.dim('Run')} ${pc.white('archlens --help')} ${pc.dim('for usage.')}`);
  console.error('');
  process.exit(1);
}
