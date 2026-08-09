import ignore, { type Ignore } from 'ignore';
import {
  DEFAULT_STRUCTURAL_IGNORE_GLOBS,
  type AnalysisOptions,
} from '../domain/analysisOptions.ts';

export type SourcePathFilter = {
  /** True when the relative path should not be scanned. */
  shouldSkip: (relativePath: string) => boolean;
};

function normalizeRelative(relativePath: string): string {
  return relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Browser-safe path filter: structural defaults + config ignore/include.
 * Does not load `.gitignore` from disk (CLI adapters add that layer).
 */
export function createStructuralPathFilter(
  options: Pick<AnalysisOptions, 'ignore' | 'include'> = { ignore: [], include: [] }
): SourcePathFilter {
  const structural: Ignore = ignore().add([...DEFAULT_STRUCTURAL_IGNORE_GLOBS]);
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
