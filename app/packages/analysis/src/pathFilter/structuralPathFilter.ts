import ignore, { type Ignore } from 'ignore';
import {
  DEFAULT_STRUCTURAL_IGNORE_GLOBS,
  STRUCTURAL_IAC_IGNORE_GLOBS,
  DEFAULT_ANALYSIS_OPTIONS,
  type AnalysisOptions,
} from '../domain/analysisOptions';

export type SourcePathFilter = {
  shouldSkip: (relativePath: string) => boolean;
};

export type StructuralPathFilterOptions = Pick<AnalysisOptions, 'ignore' | 'include'> & {
  allowIac?: boolean;
};

function normalizeRelative(relativePath: string): string {
  return relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function pathRelativeToDirectory(relativePath: string, directory: string): string | null {
  if (!directory) return relativePath;
  if (relativePath === directory) return '';
  const prefix = `${directory}/`;
  if (!relativePath.startsWith(prefix)) return null;
  return relativePath.slice(prefix.length);
}

export function createMutableGitignoreFilter(): {
  add: (content: string, relativeDirectory?: string) => void;
  ignores: (relativePath: string) => boolean;
} {
  const scopes: Array<{ dir: string; ig: Ignore }> = [{ dir: '', ig: ignore().add('.git') }];

  return {
    add: (content, relativeDirectory = '') => {
      const dir = normalizeRelative(relativeDirectory);
      const existing = scopes.find(scope => scope.dir === dir);
      if (existing) {
        existing.ig.add(content);
        return;
      }
      scopes.push({ dir, ig: ignore().add(content) });
    },
    ignores: relativePath => {
      const normalized = normalizeRelative(relativePath);
      if (!normalized || normalized === '.') return false;
      return scopes.some(scope => {
        const relative = pathRelativeToDirectory(normalized, scope.dir);
        return relative !== null && relative.length > 0 && scope.ig.ignores(relative);
      });
    },
  };
}

export function createStructuralPathFilter(
  options: StructuralPathFilterOptions = DEFAULT_ANALYSIS_OPTIONS
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
