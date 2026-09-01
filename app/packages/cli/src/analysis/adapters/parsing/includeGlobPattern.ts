import * as path from 'path';

const DEFAULT_SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.cs'];

export function parseIncludeGlobPattern(
  pattern: string,
  cwd: string
): { dir: string; extensions: string[] } {
  const resolvedPattern = path.resolve(cwd, pattern);
  const globStar = resolvedPattern.indexOf('**');
  const beforeGlob = globStar === -1 ? resolvedPattern : resolvedPattern.slice(0, globStar);
  const dir = stripTrailingSeparator(beforeGlob);

  const braceInner = braceGroupInner(resolvedPattern);
  let extensions: string[] = [];
  if (braceInner !== undefined) {
    extensions = braceInner.split(',').map(toDottedExtension);
  } else {
    const ext = trailingAlphanumericExtension(resolvedPattern);
    if (ext) extensions = [ext];
  }

  if (extensions.length === 0) {
    extensions = DEFAULT_SOURCE_EXTENSIONS;
  }

  return {
    dir: dir || path.resolve(cwd, 'src'),
    extensions,
  };
}

function stripTrailingSeparator(value: string): string {
  if (value.endsWith('/') || value.endsWith('\\')) {
    return value.slice(0, -1);
  }
  return value;
}

/** First `{...}` group without a quantified regex (avoids CodeQL js/polynomial-redos). */
function braceGroupInner(value: string): string | undefined {
  const start = value.indexOf('{');
  if (start === -1) return undefined;
  const end = value.indexOf('}', start + 1);
  if (end === -1) return undefined;
  return value.slice(start + 1, end);
}

function toDottedExtension(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

function trailingAlphanumericExtension(value: string): string | undefined {
  const lastSep = Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\'));
  const lastDot = value.lastIndexOf('.');
  if (lastDot <= lastSep || lastDot === value.length - 1) return undefined;
  const ext = value.slice(lastDot + 1);
  if (!isAlphanumeric(ext)) return undefined;
  return `.${ext}`;
}

function isAlphanumeric(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    const digit = code >= 48 && code <= 57;
    const upper = code >= 65 && code <= 90;
    const lower = code >= 97 && code <= 122;
    if (!digit && !upper && !lower) return false;
  }
  return value.length > 0;
}
