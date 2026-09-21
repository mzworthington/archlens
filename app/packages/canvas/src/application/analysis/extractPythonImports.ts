/**
 * Lightweight Python import extraction for browser lite scan.
 * Not a full parser - enough to wire module edges when tree-sitter is unavailable.
 */
export function extractPythonImports(source: string): string[] {
  const imports: string[] = [];

  for (const line of source.split('\n')) {
    const trimmed = stripComment(line.trim());
    if (!trimmed) continue;

    const fromMatch = /^from\s+(\S+)\s+import\s+/.exec(trimmed);
    if (fromMatch?.[1]) {
      imports.push(fromMatch[1]);
      continue;
    }

    const importMatch = /^import\s+(.+)$/.exec(trimmed);
    if (!importMatch?.[1]) continue;

    for (const part of importMatch[1].split(',')) {
      const moduleName = part
        .trim()
        .split(/\s+as\s+/)[0]
        ?.trim();
      if (moduleName) imports.push(moduleName);
    }
  }

  return imports;
}

function stripComment(line: string): string {
  const hash = line.indexOf('#');
  if (hash === -1) return line;
  return line.slice(0, hash).trim();
}
