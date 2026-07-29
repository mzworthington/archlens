export interface ArchitectureCliFlags {
  parserType: string | undefined;
  glob: string | undefined;
  outputDir: string | undefined;
  context: string | undefined;
  rollupModules: boolean;
  ignore: string[];
  systems: string[] | undefined;
}

export interface GitForensicsCliFlags {
  sinceDays: number | undefined;
  glob: string | undefined;
  ignore: string[];
  targetPath: string;
}

export interface ArchlensCliPlan {
  isHeadless: boolean;
  runArchitecture: boolean;
  runGitForensics: boolean;
  /** True when CLI flags already decided git on/off (skip interactive git prompt). */
  gitDecisionExplicit: boolean;
  watch: boolean;
  watchDebounceMs: number;
  architecture: ArchitectureCliFlags;
  git: GitForensicsCliFlags;
}

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

function hasExplicitGitDecision(argv: string[]): boolean {
  return (
    argv.includes('--git') ||
    argv.includes('--no-git') ||
    argv.includes('--git-only') ||
    argv.some(a => a.startsWith('--git-since')) ||
    argv[0] === 'forensics'
  );
}

export function isUpdateSubcommand(argv: string[]): boolean {
  return argv[0] === 'update';
}

export function skipUpdateCheck(argv: string[]): boolean {
  return argv.includes('--no-update-check');
}

export function isHeadlessArgv(argv: string[]): boolean {
  const legacy = argv[0] === 'forensics';
  const gitOnly = argv.includes('--git-only') || legacy;
  const forceInteractive =
    process.env.ARCHLENS_INTERACTIVE === '1' || process.env.ARCHLENS_INTERACTIVE === 'true';

  return (
    argv.includes('--headless') ||
    gitOnly ||
    !!flagValue(argv, '--parser') ||
    !!flagValue(argv, '--glob') ||
    !!flagValue(argv, '--output') ||
    !!flagValue(argv, '--context') ||
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
  const commandArgv = isUpdateSubcommand(argv) ? argv.slice(1) : argv;
  const legacy = commandArgv[0] === 'forensics';
  const legacyRest = legacy ? commandArgv.slice(1) : commandArgv;

  const noGit = commandArgv.includes('--no-git');
  const gitDecisionExplicit = hasExplicitGitDecision(commandArgv);

  const sinceFromGit =
    flagValue(commandArgv, '--git-since') ??
    (legacy ? flagValue(legacyRest, '--since') : undefined);

  const architecture: ArchitectureCliFlags = {
    parserType: flagValue(commandArgv, '--parser'),
    glob: flagValue(commandArgv, '--glob'),
    outputDir: flagValue(commandArgv, '--output'),
    context: flagValue(commandArgv, '--context'),
    rollupModules: commandArgv.includes('--rollup-modules'),
    ignore: parseCsv(flagValue(commandArgv, '--ignore')),
    systems: (() => {
      const raw = flagValue(commandArgv, '--systems');
      return raw ? parseCsv(raw) : undefined;
    })(),
  };

  const git: GitForensicsCliFlags = {
    sinceDays: parseSinceDays(sinceFromGit),
    glob:
      flagValue(commandArgv, '--glob') ?? (legacy ? flagValue(legacyRest, '--glob') : undefined),
    ignore: parseCsv(
      flagValue(commandArgv, '--ignore') ?? (legacy ? flagValue(legacyRest, '--ignore') : undefined)
    ),
    targetPath: '.',
  };

  const isHeadless = isHeadlessArgv(commandArgv);

  return {
    isHeadless,
    /** Always generate blueprints; git-only still enriches them. */
    runArchitecture: true,
    runGitForensics: !noGit,
    gitDecisionExplicit,
    watch: commandArgv.includes('--watch'),
    watchDebounceMs: parseWatchDebounce(commandArgv),
    architecture,
    git,
  };
}
