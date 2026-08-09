import pc from 'picocolors';
import { getArchlensVersion } from './version.ts';
import {
  printCatalogHelp,
  printDiffHelp,
  printEnrichHelp,
  printOverviewHelp,
  printPublishHelp,
  printResilienceHelp,
  printScanHelp,
  printUpdateHelp,
  printValidateHelp,
} from './cliHelpTopics.ts';

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

export function printCliHelp(topic: HelpTopic = 'overview'): void {
  console.log('');
  console.log(
    `${pc.bold(pc.cyan('◆'))} ${pc.bold('ARCHLENS')} ${pc.dim(getArchlensVersion())} ${pc.dim('-')} ${pc.dim('C4 blueprints from your codebase')}`
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

  console.log('');
  console.log(
    `  ${pc.dim('More:')} ${pc.white('archlens help <command>')} ${pc.dim('·')} ${pc.white('archlens --help')}`
  );
  console.log('');
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
    if (candidate === 'help') continue;
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
