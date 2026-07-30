import { resolveRelativeImport } from './resolveImportPath';

export interface ImportedFileRef {
  path: string;
  kind: 'direct';
}

/**
 * Build direct import-graph coupling refs for each scanned file.
 * Only includes targets present in the allow-list (the forensics scan set).
 */
export function buildImportCoupling(
  importsByPath: ReadonlyMap<string, readonly string[]>,
  allowedPaths: ReadonlySet<string>
): Map<string, ImportedFileRef[]> {
  const result = new Map<string, ImportedFileRef[]>();

  for (const [fromPath, specifiers] of importsByPath) {
    if (!allowedPaths.has(fromPath)) continue;

    const refs: ImportedFileRef[] = [];
    const seen = new Set<string>();

    for (const specifier of specifiers) {
      const target = resolveRelativeImport(fromPath, specifier, allowedPaths);
      if (!target || target === fromPath || seen.has(target)) continue;
      seen.add(target);
      refs.push({ path: target, kind: 'direct' });
    }

    if (refs.length > 0) {
      refs.sort((a, b) => a.path.localeCompare(b.path));
      result.set(fromPath, refs);
    }
  }

  return result;
}
