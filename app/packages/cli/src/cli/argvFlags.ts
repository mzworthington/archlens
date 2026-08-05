export type OutputFormat = 'text' | 'json';
/** Resilience supports YAML for human-readable artifacts; CI keeps JSON. */
export type ResilienceOutputFormat = OutputFormat | 'yaml';

export const DEFAULT_WATCH_DEBOUNCE_MS = 500;

export function parseWatchDebounce(argv: string[]): number {
  const raw = flagValue(argv, '--watch-debounce');
  if (!raw) return DEFAULT_WATCH_DEBOUNCE_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_WATCH_DEBOUNCE_MS;
}

export function flagValue(argv: string[], name: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const idx = argv.indexOf(name);
  if (idx !== -1 && argv[idx + 1] && !argv[idx + 1]!.startsWith('-')) {
    return argv[idx + 1];
  }
  return undefined;
}

export function parseCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export function parseSinceDays(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const days = Number(raw.replace(/d$/i, ''));
  return Number.isFinite(days) && days > 0 ? days : undefined;
}

export function parseNonNegativeInt(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : undefined;
}

export function parseStorageProvider(argv: string[]): 'r2' | 's3' | 'azure' | undefined {
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

export function parsePositiveIntFlag(argv: string[], name: string, fallback: number): number {
  const raw = flagValue(argv, name);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.trunc(parsed) : fallback;
}

export function parseOutputFormat(argv: string[]): OutputFormat {
  const raw = flagValue(argv, '--format');
  return raw === 'json' ? 'json' : 'text';
}

export function parseResilienceOutputFormat(argv: string[]): ResilienceOutputFormat {
  const raw = flagValue(argv, '--format');
  if (raw === 'json') return 'json';
  if (raw === 'yaml' || raw === 'yml') return 'yaml';
  return 'text';
}

export function positionalArgs(argv: string[]): string[] {
  return argv.filter(arg => !arg.startsWith('-'));
}

export function parsePositiveInt(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : undefined;
}

export function parseSlaThreshold(raw: string | undefined): number {
  if (raw === undefined) return 100;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 100;
}
