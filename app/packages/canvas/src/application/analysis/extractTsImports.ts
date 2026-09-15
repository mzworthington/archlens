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

  for (const line of source.split('\n')) {
    const trimmed = line.trim();
    const specifier = quotedSpecifier(trimmed);
    if (!specifier) continue;
    if (trimmed.startsWith('export ') && trimmed.includes(' from ')) {
      reExports.push(specifier);
      continue;
    }
    if (trimmed.startsWith('import ') || trimmed.includes('require(')) {
      imports.push(specifier);
    }
  }

  return { imports, reExports };
}

function quotedSpecifier(line: string): string | undefined {
  const single = line.indexOf("'");
  const double = line.indexOf('"');
  const start = single === -1 ? double : double === -1 ? single : Math.min(single, double);
  if (start === -1) return undefined;
  const quote = line[start];
  const end = line.indexOf(quote, start + 1);
  if (end === -1) return undefined;
  return line.slice(start + 1, end);
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
