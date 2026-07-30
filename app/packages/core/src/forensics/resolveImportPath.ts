import { posixDirname, posixJoin, posixNormalize } from '../lib/posixPath';

const SOURCE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.go',
  '.java',
  '.cs',
];

function specifierToRelativePath(specifier: string): string | null {
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return specifier;
  }
  if (!specifier.startsWith('.')) {
    return null;
  }

  const match = specifier.match(/^(\.+)(.*)$/);
  if (!match) return null;

  const dots = match[1];
  const rest = match[2] ?? '';
  const depth = dots.length - 1;
  const prefix = depth > 0 ? '../'.repeat(depth) : './';
  const tail = rest.replace(/\./g, '/');
  return tail ? `${prefix}${tail}` : prefix.replace(/\/$/, '') || '.';
}

/**
 * Resolve a relative import specifier from a source file to a repo-relative path.
 * Returns null when the target cannot be resolved within the scan set.
 */
export function resolveRelativeImport(
  fromFile: string,
  specifier: string,
  knownPaths: ReadonlySet<string>
): string | null {
  const normalizedFrom = fromFile.replace(/\\/g, '/');
  const relativePath = specifierToRelativePath(specifier.replace(/\\/g, '/'));
  if (!relativePath) return null;

  const fromDir = posixDirname(normalizedFrom);
  const joined = posixNormalize(posixJoin(fromDir, relativePath));

  if (knownPaths.has(joined)) return joined;

  for (const ext of SOURCE_EXTENSIONS) {
    const withExt = joined + ext;
    if (knownPaths.has(withExt)) return withExt;
  }

  for (const ext of SOURCE_EXTENSIONS) {
    const indexFile = posixJoin(joined, `index${ext}`);
    if (knownPaths.has(indexFile)) return indexFile;
  }

  return null;
}
