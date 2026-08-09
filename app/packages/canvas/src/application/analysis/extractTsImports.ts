export type ExtractedTsImports = {
  imports: string[];
  reExports: string[];
};

/**
 * Lightweight TS/JS module specifier extraction for browser lite scan.
 * Not a full parser - enough to wire relative edges between scanned files.
 * Patterns are line-oriented so `import './x'` cannot swallow a following `export … from`.
 */
export function extractTsImports(source: string): ExtractedTsImports {
  const imports: string[] = [];
  const reExports: string[] = [];

  const fromImport = /(?:^|\n)\s*import\s+(?:type\s+)?(?:[^\n]*?)\s+from\s*['"]([^'"]+)['"]/g;
  const sideEffectImport = /(?:^|\n)\s*import\s*['"]([^'"]+)['"]\s*;?/g;
  const exportFrom = /(?:^|\n)\s*export\s+(?:type\s+)?(?:[^\n]*?)\s+from\s*['"]([^'"]+)['"]/g;
  const requireCall = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match: RegExpExecArray | null;
  while ((match = fromImport.exec(source)) != null) {
    imports.push(match[1]!);
  }
  while ((match = sideEffectImport.exec(source)) != null) {
    imports.push(match[1]!);
  }
  while ((match = exportFrom.exec(source)) != null) {
    reExports.push(match[1]!);
  }
  while ((match = requireCall.exec(source)) != null) {
    imports.push(match[1]!);
  }

  return { imports, reExports };
}

/** Resolve a relative module specifier against the importing file's directory. */
export function resolveRelativeSpecifier(
  fromRelativePath: string,
  specifier: string,
  knownPaths: ReadonlySet<string>
): string | null {
  if (!specifier.startsWith('.')) return null;

  const fromDir = fromRelativePath.includes('/')
    ? fromRelativePath.slice(0, fromRelativePath.lastIndexOf('/'))
    : '';
  const joined = normalizePosixPath(fromDir ? `${fromDir}/${specifier}` : specifier);
  const candidates = [
    joined,
    `${joined}.ts`,
    `${joined}.tsx`,
    `${joined}.js`,
    `${joined}.jsx`,
    `${joined}/index.ts`,
    `${joined}/index.tsx`,
    `${joined}/index.js`,
    `${joined}/index.jsx`,
  ];

  for (const candidate of candidates) {
    if (knownPaths.has(candidate)) return candidate;
  }
  return null;
}

function normalizePosixPath(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join('/');
}
