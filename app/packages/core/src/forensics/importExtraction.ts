import { extname } from '../lib/posixPath';

const TS_IMPORT =
  /(?:import\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?|export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+|import\s+|require\s*\(\s*)['"](\.\.?[^'"]+)['"]/g;
const PY_FROM_IMPORT = /^\s*from\s+(\.+[^\s]+)\s+import/m;
const PY_IMPORT = /^\s*import\s+(\.+[^\s]+)(?:\s+as\s+\w+)?\s*$/m;
const GO_IMPORT = /['"](\.\.?\/[^'"]+)['"]/g;
const JAVA_IMPORT = /^\s*import\s+(\.[^;]+);/m;

/**
 * Extract relative import specifiers from source text (language inferred from path extension).
 */
export function extractRelativeImports(relativePath: string, text: string): string[] {
  const ext = extname(relativePath).toLowerCase();
  const imports = new Set<string>();

  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
    for (const match of text.matchAll(TS_IMPORT)) {
      const spec = match[1];
      if (spec) imports.add(spec);
    }
    return [...imports];
  }

  if (ext === '.py') {
    for (const line of text.split(/\r?\n/)) {
      const fromMatch = line.match(PY_FROM_IMPORT);
      if (fromMatch?.[1]?.startsWith('.')) {
        imports.add(fromMatch[1]);
      }
      const importMatch = line.match(PY_IMPORT);
      if (importMatch?.[1]?.startsWith('.')) {
        imports.add(importMatch[1]);
      }
    }
    return [...imports];
  }

  if (ext === '.go') {
    for (const match of text.matchAll(GO_IMPORT)) {
      const spec = match[1];
      if (spec) imports.add(spec);
    }
    return [...imports];
  }

  if (ext === '.java') {
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(JAVA_IMPORT);
      if (match?.[1]?.startsWith('.')) imports.add(match[1]);
    }
  }

  return [...imports];
}
