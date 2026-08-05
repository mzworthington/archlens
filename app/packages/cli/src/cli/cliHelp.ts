import pc from 'picocolors';
import { getArchlensVersion } from './version.ts';
import { DEFAULT_SCAN_GLOB } from '../analysis/domain/analysisOptions.ts';

export type HelpTopic =
  | 'overview'
  | 'scan'
  | 'enrich'
  | 'validate'
  | 'diff'
  | 'resilience'
  | 'publish'
  | 'catalog'
  | 'update';

const SUBCOMMANDS = [
  'scan',
  'enrich',
  'validate',
  'diff',
  'resilience',
  'publish',
  'catalog',
  'update',
  'help',
  'forensics',
] as const;

const TOPIC_ALIASES: Record<string, HelpTopic> = {
  scan: 'scan',
  enrich: 'enrich',
  validate: 'validate',
  diff: 'diff',
  resilience: 'resilience',
  publish: 'publish',
  catalog: 'catalog',
  update: 'update',
  flags: 'overview',
};

export function wantsHelpFlag(argv: string[]): boolean {
  return argv.includes('--help') || argv.includes('-h');
}

export function isHelpSubcommand(argv: string[]): boolean {
  return argv[0] === 'help';
}

export function isKnownSubcommand(
  token: string | undefined
): token is (typeof SUBCOMMANDS)[number] {
  return !!token && (SUBCOMMANDS as readonly string[]).includes(token);
}

export function resolveHelpRequest(argv: string[]): { isHelp: boolean; topic: HelpTopic } {
  if (isHelpSubcommand(argv)) {
    const topic = argv[1] ? TOPIC_ALIASES[argv[1]] : undefined;
    return { isHelp: true, topic: topic ?? 'overview' };
  }

  if (!wantsHelpFlag(argv)) {
    return { isHelp: false, topic: 'overview' };
  }

  const positional = argv.filter(arg => !arg.startsWith('-'));
  const command = positional[0];
  const topic = command ? TOPIC_ALIASES[command] : undefined;
  return { isHelp: true, topic: topic ?? 'overview' };
}

function heading(text: string): void {
  console.log(pc.bold(pc.cyan(`\n${text}`)));
}

function line(text = ''): void {
  console.log(text);
}

function command(name: string, summary: string): void {
  console.log(`  ${pc.bold(pc.white(name.padEnd(22)))} ${pc.dim(summary)}`);
}

function flag(name: string, summary: string): void {
  console.log(`  ${pc.cyan(name.padEnd(28))} ${summary}`);
}

function example(text: string): void {
  console.log(`  ${pc.dim('$')} ${pc.white(text)}`);
}

function printOverviewHelp(): void {
  heading('USAGE');
  line(`  ${pc.white('archlens')} ${pc.dim('[command] [options]')}`);
  line('');
  line(`  ${pc.dim('Run with no arguments in a terminal for the guided wizard.')}`);
  line(`  ${pc.dim('Use')} ${pc.white('scan')} ${pc.dim('or flags for CI / scripts.')}`);

  heading('COMMANDS');
  command('(default)', 'Interactive menu — scan, publish, fragments, compose, overlays');
  command('scan', 'Headless architecture scan (uses blueprint.config.json + defaults)');
  command('enrich', 'Re-run externals pass on existing YAML (no source re-scan)');
  command(
    'validate [path]',
    'Architecture health: cycles + forensics actions (optional --contract / --since-commit)'
  );
  command('publish [path]', 'Plan remote catalog snapshot upload (dry run by default)');
  command('catalog …', 'Estate fragments: publish-fragment + compose (ADR-0014)');
  command('resilience [path]', 'Headless ChaosLens sweep + ranked recommendations');
  command('diff [base] [head]', 'Structural diff between two blueprint trees');
  command('update', 'Install the latest release binary (compiled builds only)');
  command(
    'help [topic]',
    'Show help (topics: scan, enrich, validate, diff, publish, catalog, resilience, update)'
  );

  heading('COMMON FLAGS');
  flag('--headless', 'Skip interactive prompts');
  flag('--glob=<pattern>', `Source files to scan (default: ${DEFAULT_SCAN_GLOB})`);
  flag('--output=<dir>', 'Blueprint output folder (default: blueprints)');
  flag('--context=<name>', 'Root entityRef slug (default: blueprint)');
  flag('--system-name=<name>', 'Software system for this repo (multi-repo products)');
  flag('--publish', 'After scan, upload output tree to object storage (--no-dry-run)');
  flag(
    '--key-prefix=<path>',
    'With --publish: object key prefix (or OBJECT_STORAGE_KEY_PREFIX; samples estate: estates/{id}/)'
  );
  flag('--workspace-name=<name>', 'With --publish: workspace name for entityRef resolution');
  flag(
    '--skip-validation',
    'With --publish: allow upload without a validation gate (default; use --validate to gate)'
  );
  flag('--validate', 'With --publish: fail upload when workspace validation fails');
  flag('--no-git', 'Skip TraceLens git forensics enrichment');
  flag('--git --git-since=<days>', 'Enable forensics with lookback window');
  flag('--watch', 'Re-run when source files change');
  flag('--no-update-check', 'Skip startup update prompt');
  flag('--version, -V', 'Print version');

  heading('EXAMPLES');
  example('archlens');
  example('archlens scan --output=blueprints');
  example('archlens scan --headless --output=blueprints --publish');
  example('archlens scan --headless --no-git --glob="**/*.{ts,tsx}"');
  example('archlens enrich');
  example('archlens enrich --git --git-since=90');
  example('archlens validate blueprints/ --since-commit=HEAD~1');
  example('archlens publish blueprints/ --format=json');
  example('archlens resilience blueprints/chaoslens-stress/');
  example('archlens diff main-blueprints/ pr-blueprints/');
  example('archlens help scan');

  heading('ENVIRONMENT');
  flag('ARCHLENS_OUTPUT_DIR', 'Default output directory');
  flag('ARCHLENS_INTERACTIVE=1', 'Force interactive mode in CI / non-TTY');
  line('');
  line(`  ${pc.dim('Docs:')} ${pc.cyan('docs/guide/cli.md')} ${pc.dim('in the ArchLens repo')}`);
}

function printScanHelp(): void {
  heading('archlens scan');
  line(`  ${pc.dim('Non-interactive architecture scan from source to C4 YAML.')}`);
  line('');

  heading('USAGE');
  example('archlens scan [options]');
  example('archlens --scan [options]');

  heading('OPTIONS');
  flag('--glob=<pattern>', `Files to analyze (default: ${DEFAULT_SCAN_GLOB})`);
  flag('--output=<dir>', 'Write YAML under this folder');
  flag('--context=<name>', 'Context diagram root name / entityRef');
  flag('--system-name=<name>', 'Name this repo on the context diagram (multi-repo products)');
  flag('--parser=tree-sitter|ts-morph', 'AST engine (default: tree-sitter)');
  flag('--rollup-modules', 'Collapse *-module-* packages into prefix systems');
  flag('--ignore=<a,b>', 'Extra ignore globs (comma-separated)');
  flag('--systems=<a,b>', 'Restrict discovery to these roots');
  flag('--no-git', 'Structure-only scan (no TraceLens blocks)');
  flag('--git --git-since=<days>', 'Attach git forensics (default on)');
  flag('--publish', 'Upload output tree to object storage after a successful scan');
  flag(
    '--key-prefix=<path>',
    'With --publish: object key prefix inside the bucket (isolates catalogs; see ADR-0014)'
  );
  flag('--workspace-name=<name>', 'With --publish: workspace name for entityRef resolution');
  flag(
    '--skip-validation',
    'Allow upload without a validation gate (default; catalogs prefer visibility over blocking)'
  );
  flag('--validate', 'Fail publish when workspace validation fails (optional hard gate)');
  flag('--watch [--watch-debounce=<ms>]', 'Re-run on file changes');
  flag('--headless', 'Same as scan — never prompts');

  heading('EXAMPLES');
  example('archlens scan');
  example('archlens scan --output=blueprints --no-git');
  example('archlens scan --output=blueprints --publish');
  example('archlens scan --output=blueprints --publish --validate');
  example(
    'archlens scan --output=blueprints --key-prefix=estates/samples --workspace-name=samples --publish'
  );
  example('archlens scan --glob="packages/**/*.ts" --context=my-app');
  example('archlens scan --context=acme --system-name=frontend-api');
}

function printEnrichHelp(): void {
  heading('archlens enrich');
  line(`  ${pc.dim('Refresh cross-diagram dependency edges on existing YAML.')}`);
  line(`  ${pc.dim('Does not re-parse source — use after upgrades or hand-edited blueprints.')}`);
  line('');

  heading('USAGE');
  example('archlens enrich [options]');
  example('archlens --enrich-only [options]');

  heading('OPTIONS');
  flag('--output=<dir>', 'Blueprint folder (default: blueprints)');
  flag('--git', 'Also refresh TraceLens git metrics on nodes');
  flag('--git-since=<days>', 'Forensics lookback when --git is set');

  heading('EXAMPLES');
  example('archlens enrich');
  example('archlens enrich --git --git-since=365');
}

function printValidateHelp(): void {
  heading('archlens validate');
  line(
    `  ${pc.dim('Report what to fix in the codebase: actionable module direct-call cycles and')}`
  );
  line(
    `  ${pc.dim('TraceLens forensics (hotspots, silos, heating). Other coupling cycles are informational.')}`
  );
  line(
    `  ${pc.dim('Wiring/schema contract checks are opt-in via --contract (also used by publish --validate).')}`
  );
  line('');

  heading('USAGE');
  example('archlens validate [path] [options]');

  heading('OPTIONS');
  flag('--path=<dir>', 'Blueprint tree (default: blueprints)');
  flag('--format=text|json', 'Output format (default: text)');
  flag('--contract', 'Also fail on BlueprintSpec wiring/schema issues');
  flag('--since-commit[=<ref>]', 'Compare health to blueprints at git ref (default HEAD~1)');
  flag('--baseline=<dir>', 'Compare health to another on-disk blueprint tree');

  heading('EXAMPLES');
  example('archlens validate');
  example('archlens validate blueprints/ --since-commit=HEAD~1');
  example('archlens validate blueprints/ --baseline=.archlens/base-blueprints');
  example('archlens validate custom-blueprints/ --contract --format=json');
}

function printDiffHelp(): void {
  heading('archlens diff');
  line(`  ${pc.dim('Compare two blueprint trees for added/removed/changed nodes and edges.')}`);
  line(`  ${pc.dim('Exits with code 1 when trees differ (CI-friendly).')}`);
  line('');

  heading('USAGE');
  example('archlens diff [baseline] [current] [options]');

  heading('OPTIONS');
  flag('--baseline=<dir>', 'Baseline tree (default: blueprints)');
  flag('--current=<dir>', 'Current tree (default: same as baseline)');
  flag('--format=text|json', 'Output format (default: text)');

  heading('EXAMPLES');
  example('archlens diff base-blueprints/ head-blueprints/');
  example('archlens diff --baseline=main --current=pr --format=json');
}

function printResilienceHelp(): void {
  heading('archlens resilience');
  line(
    `  ${pc.dim('Run headless ChaosLens failure simulations across blueprint diagrams and rank recommendations.')}`
  );
  line('');

  heading('USAGE');
  example('archlens resilience [path] [options]');

  heading('OPTIONS');
  flag('--path=<dir>', 'Blueprint tree (default: blueprints)');
  flag('--chaos-specs=<dir>', 'Optional ChaosSpec YAML directory (e.g. chaos-specs/)');
  flag('--min-sla=<percent>', 'Exit 1 when worst SLA falls below threshold (default: 100)');
  flag('--fail-on-recommendations', 'Exit 1 when any recommendation is emitted');
  flag('--max-region-outages=<n>', 'Cap region-outage scenarios per diagram (default: 15)');
  flag('--max-fan-in-probes=<n>', 'Cap fan-in latency probes per diagram (default: 5)');
  flag('--format=text|json|yaml', 'Output format (default: text; CI uses json)');
  flag('--output=<file>', 'Write AdviceLens artifact to a file (.json or .yaml)');

  heading('EXAMPLES');
  example('archlens resilience blueprints/chaoslens-stress/');
  example('archlens resilience --chaos-specs=chaos-specs --min-sla=95');
  example('archlens resilience --format=json --output=.archlens/advicelens-report.json');
  example('archlens resilience --format=yaml --output=advicelens-report.yaml');
  example('archlens resilience --format=json --fail-on-recommendations');
}

function printPublishHelp(): void {
  heading('archlens publish');
  line(
    `  ${pc.dim('Validate a blueprint tree and plan or upload an immutable remote catalog snapshot (ADR-0010).')}`
  );
  line(`  ${pc.dim('Upload uses @archlens/storage (R2, S3, or Azure Blob adapters).')}`);
  line('');

  heading('USAGE');
  example('archlens publish [path] [options]');

  heading('OPTIONS');
  flag('--path=<dir>', 'Blueprint tree (default: blueprints)');
  flag('--workspace-name=<name>', 'Workspace name for entityRef resolution (default: blueprints)');
  flag(
    '--provider=r2|s3|azure',
    'Object storage provider (default: OBJECT_STORAGE_PROVIDER or r2)'
  );
  flag('--format=text|json', 'Output format (default: text)');
  flag('--bucket=<name>', 'Bucket/container (default: OBJECT_STORAGE_BUCKET / R2_BUCKET env)');
  flag('--account-id=<id>', 'Cloudflare account id for R2 endpoint override');
  flag(
    '--key-prefix=<path>',
    'Object key prefix inside the bucket (or OBJECT_STORAGE_KEY_PREFIX; samples estate: estates/{id}/)'
  );
  flag('--no-dry-run', 'Upload snapshot to object storage');
  flag(
    '--skip-validation',
    'Allow upload without a validation gate (default; use --validate to gate)'
  );
  flag('--validate', 'Fail publish when workspace validation fails');

  heading('EXAMPLES');
  example('archlens publish blueprints/');
  example('archlens publish custom-blueprints/ --format=json');
  example(
    'archlens publish samples/ --workspace-name=samples --key-prefix=estates/samples --no-dry-run'
  );
  example('archlens publish blueprints/ --validate --no-dry-run');
}

function printCatalogHelp(): void {
  heading('archlens catalog');
  line(
    `  ${pc.dim('Stage estate fragments and compose them into an ADR-0010 latest snapshot (ADR-0014).')}`
  );
  line('');

  heading('USAGE');
  example(
    'archlens catalog publish-fragment [path] --estate=<id> --product=<id> --source-ref=<ref>'
  );
  example('archlens catalog compose --estate=<id>');
  example('archlens catalog accept-overlay --estate=<id> --file=<overlay.yaml>');
  example('archlens catalog reject-overlay --estate=<id> --overlay-id=<id>');

  heading('publish-fragment OPTIONS');
  flag('--estate=<id>', 'Estate id (default key prefix estates/{id}/)');
  flag('--product=<id>', 'Product composition key');
  flag('--system=<id>', 'Optional system / path slice within the product');
  flag('--fragment-key=<id>', 'Override fragment key (default: product[--system])');
  flag('--source-ref=<ref>', 'Repo@sha or CI run identity');
  flag('--run-id=<id>', 'Optional run id (default: UTC timestamp)');
  flag('--path=<dir>', 'Blueprint tree (default: blueprints)');
  flag('--key-prefix=<path>', 'Override object key prefix (default: estates/{estate}/)');
  flag('--no-dry-run', 'Upload fragment to object storage');
  flag(
    '--skip-validation',
    'Allow upload without a validation gate (default; use --validate to gate)'
  );
  flag('--validate', 'Fail fragment publish when workspace validation fails');

  heading('compose OPTIONS');
  flag('--estate=<id>', 'Estate id to compose (loads fragments/ under the key prefix)');
  flag('--workspace-name=<name>', 'Workspace name for validation / catalog');
  flag('--key-prefix=<path>', 'Override object key prefix (default: estates/{estate}/)');
  flag('--max-retries=<n>', 'CAS retries on latest/manifest.json (default: 3)');
  flag('--no-dry-run', 'Upload composed snapshot and CAS-update latest');
  flag('--allow-empty', 'Exit 0 when no fragments are staged (cron safety nets)');
  flag(
    '--skip-validation',
    'Allow compose without a validation gate (default; use --validate to gate)'
  );
  flag('--validate', 'Fail compose when the composed tree fails validation');
  flag('--format=text|json', 'Output format (default: text)');

  heading('accept-overlay / reject-overlay OPTIONS');
  flag('--estate=<id>', 'Estate id (default key prefix estates/{id}/)');
  flag('--file=<overlay.yaml>', 'accept-overlay: suggestion overlay document to stage');
  flag('--overlay-id=<id>', 'reject-overlay: overlay id to tombstone');
  flag('--key-prefix=<path>', 'Override object key prefix (default: estates/{estate}/)');
  flag('--no-dry-run', 'Write overlay accept/reject to object storage');

  heading('EXAMPLES');
  example(
    'archlens catalog publish-fragment blueprints/ --estate=acme --product=payments --source-ref=repo@abc --no-dry-run'
  );
  example(
    'archlens catalog accept-overlay --estate=acme --file=overlays/add-billing.yaml --no-dry-run'
  );
  example('archlens catalog reject-overlay --estate=acme --overlay-id=add-billing --no-dry-run');
  example('archlens catalog compose --estate=acme');
  example('archlens catalog compose --estate=acme --no-dry-run --format=json');
}

function printUpdateHelp(): void {
  heading('archlens update');
  line(`  ${pc.dim('Download and install the latest release binary, then re-launch.')}`);
  line(`  ${pc.dim('Available only for compiled release builds — skipped in dev/source runs.')}`);
  line('');

  heading('USAGE');
  example('archlens update');

  heading('OPTIONS');
  flag('--no-update-check', 'Skip the interactive startup update prompt on other commands');
}

export function printCliHelp(topic: HelpTopic = 'overview'): void {
  console.log('');
  console.log(
    `${pc.bold(pc.cyan('◆'))} ${pc.bold('ARCHLENS')} ${pc.dim(getArchlensVersion())} ${pc.dim('—')} ${pc.dim('C4 blueprints from your codebase')}`
  );

  switch (topic) {
    case 'scan':
      printScanHelp();
      break;
    case 'enrich':
      printEnrichHelp();
      break;
    case 'validate':
      printValidateHelp();
      break;
    case 'diff':
      printDiffHelp();
      break;
    case 'resilience':
      printResilienceHelp();
      break;
    case 'publish':
      printPublishHelp();
      break;
    case 'catalog':
      printCatalogHelp();
      break;
    case 'update':
      printUpdateHelp();
      break;
    default:
      printOverviewHelp();
      break;
  }

  line('');
  line(
    `  ${pc.dim('More:')} ${pc.white('archlens help <command>')} ${pc.dim('·')} ${pc.white('archlens --help')}`
  );
  line('');
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) matrix[i]![0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost
      );
    }
  }
  return matrix[a.length]![b.length]!;
}

export function suggestSubcommand(input: string): string | undefined {
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const candidate of SUBCOMMANDS) {
    if (candidate === 'help' || candidate === 'forensics') continue;
    const distance = levenshtein(input.toLowerCase(), candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return bestDistance <= 2 ? best : undefined;
}

export function reportUnknownSubcommand(argv: string[]): never {
  const unknown = argv[0] ?? '';
  const suggestion = suggestSubcommand(unknown);
  console.error('');
  console.error(`${pc.red('✖')} ${pc.bold(pc.red(`Unknown command: ${unknown}`))}`);
  if (suggestion) {
    console.error(
      `  ${pc.dim('Did you mean')} ${pc.white(`archlens ${suggestion}`)}${pc.dim('?')}`
    );
  }
  console.error(`  ${pc.dim('Run')} ${pc.white('archlens help')} ${pc.dim('for usage.')}`);
  console.error('');
  process.exit(1);
}

export function assertKnownSubcommand(argv: string[]): void {
  const first = argv[0];
  if (!first || first.startsWith('-')) return;
  if (isKnownSubcommand(first)) return;
  reportUnknownSubcommand(argv);
}
