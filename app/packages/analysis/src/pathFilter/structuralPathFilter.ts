import ignore, { type Ignore } from 'ignore';
import {
  DEFAULT_STRUCTURAL_IGNORE_GLOBS,
  STRUCTURAL_IAC_IGNORE_GLOBS,
  type AnalysisOptions,
} from '../domain/analysisOptions.ts';

export type SourcePathFilter = {
  /** True when the relative path should not be scanned. */
  shouldSkip: (relativePath: string) => boolean;
};

export type StructuralPathFilterOptions = Pick<AnalysisOptions, 'ignore' | 'include'> & {
  /**
   * When true, omit IaC extension globs so a walker can collect Terraform/Pulumi
   * for `IacAnalyzer` while still ignoring docs/tooling noise.
   */
  allowIac?: boolean;
};

function normalizeRelative(relativePath: string): string {
  return relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Browser-safe path filter: structural defaults + config ignore/include.
 * Does not load `.gitignore` from disk (CLI adapters add that layer).
 */
export function createStructuralPathFilter(
  options: StructuralPathFilterOptions = { ignore: [], include: [] }
): SourcePathFilter {
  const structuralGlobs = options.allowIac
    ? DEFAULT_STRUCTURAL_IGNORE_GLOBS.filter(glob => !STRUCTURAL_IAC_IGNORE_GLOBS.includes(glob))
    : DEFAULT_STRUCTURAL_IGNORE_GLOBS;
  const structural: Ignore = ignore().add([...structuralGlobs]);
  const extra: Ignore = ignore().add(options.ignore || []);
  const include: Ignore | null =
    options.include && options.include.length > 0 ? ignore().add(options.include) : null;

  return {
    shouldSkip(relativePath: string): boolean {
      const normalized = normalizeRelative(relativePath);
      if (!normalized || normalized === '.') return false;

      if (structural.ignores(normalized)) return true;
      if (options.ignore?.length && extra.ignores(normalized)) return true;
      if (include && !include.ignores(normalized)) return true;

      return false;
    },
  };
}
