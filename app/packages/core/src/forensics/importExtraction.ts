import { extname } from '../lib/posixPath';

const GO_IMPORT = /['"](\.\.?\/[^'"]+)['"]/g;

/** Collect relative specs from `from '…'` / `import '…'` / `require('…')` without nested `\s` ReDoS. */
function extractTsRelativeImports(text: string): string[] {
  const imports = new Set<string>();

  const addQuotedAfterKeyword = (source: string, keyword: string): void => {
    let searchFrom = 0;
    while (searchFrom < source.length) {
      const idx = source.indexOf(keyword, searchFrom);
      if (idx === -1) break;
      // Word boundary: keyword must not be preceded by an identifier char.
      if (idx > 0 && /[A-Za-z0-9_$]/.test(source[idx - 1]!)) {
        searchFrom = idx + keyword.length;
        continue;
      }
      let i = idx + keyword.length;
      while (i < source.length && (source[i] === ' ' || source[i] === '\t')) i++;
      const quote = source[i];
      if (quote !== "'" && quote !== '"') {
        searchFrom = idx + keyword.length;
        continue;
      }
      const start = i + 1;
      let end = start;
      while (end < source.length && source[end] !== quote && source[end] !== '\n') end++;
      if (end < source.length && source[end] === quote) {
        const spec = source.slice(start, end);
        if (spec.startsWith('.')) imports.add(spec);
      }
      searchFrom = end + 1;
    }
  };

  const addRequireSpecs = (source: string): void => {
    let searchFrom = 0;
    while (searchFrom < source.length) {
      const idx = source.indexOf('require', searchFrom);
      if (idx === -1) break;
      if (idx > 0 && /[A-Za-z0-9_$]/.test(source[idx - 1]!)) {
        searchFrom = idx + 7;
        continue;
      }
      let i = idx + 7;
      while (i < source.length && (source[i] === ' ' || source[i] === '\t')) i++;
      if (source[i] !== '(') {
        searchFrom = idx + 7;
        continue;
      }
      i++;
      while (i < source.length && (source[i] === ' ' || source[i] === '\t')) i++;
      const quote = source[i];
      if (quote !== "'" && quote !== '"') {
        searchFrom = idx + 7;
        continue;
      }
      const start = i + 1;
      let end = start;
      while (end < source.length && source[end] !== quote && source[end] !== '\n') end++;
      if (end < source.length && source[end] === quote) {
        const spec = source.slice(start, end);
        if (spec.startsWith('.')) imports.add(spec);
      }
      searchFrom = end + 1;
    }
  };

  addQuotedAfterKeyword(text, 'from');
  addQuotedAfterKeyword(text, 'import');
  addRequireSpecs(text);

  return [...imports];
}

function extractPyRelativeImports(text: string): string[] {
  const imports = new Set<string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('from ')) {
      const afterFrom = line.slice(5).trimStart();
      if (!afterFrom.startsWith('.')) continue;
      const spaceIdx = afterFrom.search(/[ \t]/);
      if (spaceIdx === -1) continue;
      const spec = afterFrom.slice(0, spaceIdx);
      const rest = afterFrom.slice(spaceIdx).trimStart();
      if (rest.startsWith('import')) imports.add(spec);
      continue;
    }
    if (line.startsWith('import ')) {
      let afterImport = line.slice(7).trimStart();
      if (!afterImport.startsWith('.')) continue;
      const asIdx = afterImport.search(/[ \t]+as[ \t]+/);
      if (asIdx !== -1) afterImport = afterImport.slice(0, asIdx);
      const spec = afterImport.trim();
      if (spec.startsWith('.') && !/[ \t]/.test(spec)) imports.add(spec);
    }
  }
  return [...imports];
}

function extractJavaRelativeImports(text: string): string[] {
  const imports = new Set<string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith('import ')) continue;
    let rest = line.slice(7).trimStart();
    if (!rest.startsWith('.')) continue;
    if (rest.endsWith(';')) rest = rest.slice(0, -1).trimEnd();
    if (rest.startsWith('.')) imports.add(rest);
  }
  return [...imports];
}

/**
 * Extract relative import specifiers from source text (language inferred from path extension).
 */
export function extractRelativeImports(relativePath: string, text: string): string[] {
  const ext = extname(relativePath).toLowerCase();

  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
    return extractTsRelativeImports(text);
  }

  if (ext === '.py') {
    return extractPyRelativeImports(text);
  }

  if (ext === '.go') {
    const imports = new Set<string>();
    for (const match of text.matchAll(GO_IMPORT)) {
      const spec = match[1];
      if (spec) imports.add(spec);
    }
    return [...imports];
  }

  if (ext === '.java') {
    return extractJavaRelativeImports(text);
  }

  return [];
}
