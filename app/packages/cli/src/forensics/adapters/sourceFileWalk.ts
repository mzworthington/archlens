import fs from 'fs';
import path from 'path';

export interface ParsedGlobPattern {
  dir: string;
  extensions: string[];
}

const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.cs'];

function isExtensionChar(code: number): boolean {
  const isNum = code >= 48 && code <= 57;
  const isUpper = code >= 65 && code <= 90;
  const isLower = code >= 97 && code <= 122;
  return isNum || isUpper || isLower;
}

function stripTrailingSeparator(value: string): string {
  if (value.endsWith('/') || value.endsWith('\\')) return value.slice(0, -1);
  return value;
}

function extensionLabel(option: string): string {
  const trimmed = option.trim();
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

function splitBraceOptions(inner: string): string[] {
  const parts: string[] = [];
  let current = '';
  for (const ch of inner) {
    if (ch === ',') {
      const trimmed = current.trim();
      if (trimmed) parts.push(trimmed);
      current = '';
      continue;
    }
    current += ch;
  }
  const trimmed = current.trim();
  if (trimmed) parts.push(trimmed);
  return parts;
}

function extensionsFromBraceSet(resolvedPattern: string): string[] | undefined {
  const open = resolvedPattern.indexOf('{');
  if (open < 0) return undefined;
  const close = resolvedPattern.indexOf('}', open + 1);
  if (close < 0) return undefined;
  const inner = resolvedPattern.slice(open + 1, close);
  if (!inner || inner.includes('{')) return undefined;
  const options = splitBraceOptions(inner);
  if (options.length === 0) return undefined;
  return options.map(extensionLabel);
}

function extensionFromSuffix(resolvedPattern: string): string | undefined {
  const star = resolvedPattern.lastIndexOf('*');
  const slash = Math.max(resolvedPattern.lastIndexOf('/'), resolvedPattern.lastIndexOf('\\'));
  const dot = resolvedPattern.lastIndexOf('.');
  if (dot < 0 || dot < slash || dot < star) return undefined;
  const ext = resolvedPattern.slice(dot);
  if (ext.length < 2) return undefined;
  for (let i = 1; i < ext.length; i++) {
    if (!isExtensionChar(ext.charCodeAt(i))) return undefined;
  }
  return ext.toLowerCase();
}

export function parseForensicsGlobPattern(cwd: string, pattern: string): ParsedGlobPattern {
  const resolvedPattern = path.resolve(cwd, pattern);
  const baseDir = stripTrailingSeparator(resolvedPattern.split('**')[0] ?? '');
  const braceExts = extensionsFromBraceSet(resolvedPattern);
  const suffix = extensionFromSuffix(resolvedPattern);
  const extensions = braceExts ?? (suffix ? [suffix] : DEFAULT_EXTENSIONS);

  return {
    dir: baseDir || cwd,
    extensions,
  };
}

function walkDirectory(
  absoluteDir: string,
  cwd: string,
  extensions: readonly string[],
  shouldSkip: (relativePath: string) => boolean,
  results: string[]
): void {
  if (!fs.existsSync(absoluteDir)) return;

  for (const entry of fs.readdirSync(absoluteDir)) {
    const absolute = path.join(absoluteDir, entry);
    try {
      const stat = fs.statSync(absolute);
      if (stat.isDirectory()) {
        walkDirectory(absolute, cwd, extensions, shouldSkip, results);
        continue;
      }

      const ext = path.extname(entry).toLowerCase();
      if (!extensions.includes(ext)) continue;

      const relativePath = path.relative(cwd, absolute).replace(/\\/g, '/');
      if (shouldSkip(relativePath)) continue;
      results.push(relativePath);
    } catch {}
  }
}

export function listFilesForGlob(
  cwd: string,
  pattern: string,
  shouldSkip: (relativePath: string) => boolean
): string[] {
  const { dir, extensions } = parseForensicsGlobPattern(cwd, pattern);
  const results: string[] = [];
  walkDirectory(dir, cwd, extensions, shouldSkip, results);
  return results.sort((a, b) => a.localeCompare(b));
}
