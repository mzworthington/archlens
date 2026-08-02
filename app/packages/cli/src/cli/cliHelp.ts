import pc from 'picocolors';
import { getArchlensVersion } from './version.ts';
import { DEFAULT_SCAN_GLOB } from '../analysis/domain/analysisOptions.ts';

export type HelpTopic =
  'overview' | 'scan' | 'enrich' | 'validate' | 'diff' | 'resilience' | 'update';

const SUBCOMMANDS = [
  'scan',
  'enrich',
  'validate',
  'diff',
  'resilience',
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
  command('(default)', 'Interactive wizard — context, glob, output, TraceLens');
  command('scan', 'Headless architecture scan (uses blueprint.config.json + defaults)');
  command('enrich', 'Re-run externals pass on existing YAML (no source re-scan)');
  command('validate [path]', 'Validate blueprint tree (schema, cycles, entityRef links)');
  command('resilience [path]', 'Headless ChaosLens sweep + ranked recommendations');
  command('diff [base] [head]', 'Structural diff between two blueprint trees');
  command('update', 'Install the latest release binary (compiled builds only)');
  command('help [topic]', 'Show help (topics: scan, enrich, validate, diff, resilience, update)');

  heading('COMMON FLAGS');
  flag('--headless', 'Skip interactive prompts');
  flag('--glob=<pattern>', `Source files to scan (default: ${DEFAULT_SCAN_GLOB})`);
  flag('--output=<dir>', 'Blueprint output folder (default: blueprints)');
  flag('--context=<name>', 'Root entityRef slug (default: blueprint)');
  flag('--system-name=<name>', 'Software system for this repo (multi-repo products)');
  flag('--no-git', 'Skip TraceLens git forensics enrichment');
  flag('--git --git-since=<days>', 'Enable forensics with lookback window');
  flag('--watch', 'Re-run when source files change');
  flag('--no-update-check', 'Skip startup update prompt');
  flag('--version, -V', 'Print version');

  heading('EXAMPLES');
  example('archlens');
  example('archlens scan --output=blueprints');
  example('archlens scan --headless --no-git --glob="**/*.{ts,tsx}"');
  example('archlens enrich');
  example('archlens enrich --git --git-since=90');
  example('archlens validate blueprints/');
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
  flag('--watch [--watch-debounce=<ms>]', 'Re-run on file changes');
  flag('--headless', 'Same as scan — never prompts');

  heading('EXAMPLES');
  example('archlens scan');
  example('archlens scan --output=blueprints --no-git');
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
    `  ${pc.dim('Check blueprint YAML for schema errors, cycles, and broken entityRef links.')}`
  );
  line('');

  heading('USAGE');
  example('archlens validate [path] [options]');

  heading('OPTIONS');
  flag('--path=<dir>', 'Blueprint tree (default: blueprints)');
  flag('--format=text|json', 'Output format (default: text)');

  heading('EXAMPLES');
  example('archlens validate');
  example('archlens validate custom-blueprints/ --format=json');
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
  flag('--format=text|json', 'Output format (default: text)');
  flag('--output=<file>', 'Write AdviceLens JSON artifact to a file (CI-friendly)');

  heading('EXAMPLES');
  example('archlens resilience blueprints/chaoslens-stress/');
  example('archlens resilience --chaos-specs=chaos-specs --min-sla=95');
  example('archlens resilience --format=json --output=.archlens/advicelens-report.json');
  example('archlens resilience --format=json --fail-on-recommendations');
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
