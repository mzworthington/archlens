/**
 * Lightweight Python import extraction for browser lite scan.
 * Not a full parser - enough to wire module edges when tree-sitter is unavailable.
 */
export function extractPythonImports(source: string): string[] {
  const imports: string[] = [];

  for (const line of source.split('\n')) {
    const trimmed = stripComment(line.trim());
    if (!trimmed) continue;

    const fromModule = readFromImport(trimmed);
    if (fromModule) {
      imports.push(fromModule);
      continue;
    }

    for (const moduleName of readPlainImports(trimmed)) {
      imports.push(moduleName);
    }
  }

  return imports;
}

function isSpace(char: string | undefined): boolean {
  return char === ' ' || char === '\t' || char === '\f' || char === '\v';
}

function skipSpaces(line: string, index: number): number {
  let i = index;
  while (isSpace(line[i])) i += 1;
  return i;
}

function readToken(line: string, index: number): { token: string; next: number } {
  const start = index;
  let i = index;
  while (i < line.length && !isSpace(line[i])) i += 1;
  return { token: line.slice(start, i), next: i };
}

function startsWithWord(line: string, index: number, word: string): boolean {
  if (!line.startsWith(word, index)) return false;
  const after = line[index + word.length];
  return after === undefined || isSpace(after);
}

function readFromImport(line: string): string | null {
  if (!startsWithWord(line, 0, 'from')) return null;
  const module = readToken(line, skipSpaces(line, 'from'.length));
  if (!module.token) return null;
  const importAt = skipSpaces(line, module.next);
  if (!startsWithWord(line, importAt, 'import')) return null;
  return module.token;
}

function readPlainImports(line: string): string[] {
  if (!startsWithWord(line, 0, 'import')) return [];
  const clause = line.slice('import'.length).trim();
  if (!clause) return [];

  const names: string[] = [];
  for (const part of clause.split(',')) {
    const moduleName = moduleBeforeAlias(part.trim());
    if (moduleName) names.push(moduleName);
  }
  return names;
}

function moduleBeforeAlias(part: string): string {
  let i = 0;
  while (i < part.length) {
    const asAt = part.indexOf('as', i);
    if (asAt === -1) return part;
    const before = asAt === 0 ? undefined : part[asAt - 1];
    const after = part[asAt + 2];
    if (isSpace(before) && isSpace(after)) return part.slice(0, asAt).trim();
    i = asAt + 2;
  }
  return part;
}

function stripComment(line: string): string {
  const hash = line.indexOf('#');
  if (hash === -1) return line;
  return line.slice(0, hash).trim();
}
