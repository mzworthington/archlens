/** Minimal POSIX path helpers for repo-relative paths (no Node dependency). */

export function posixDirname(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash <= 0) return lastSlash === 0 ? '/' : '.';
  return normalized.slice(0, lastSlash);
}

export function posixJoin(...segments: string[]): string {
  return posixNormalize(segments.join('/'));
}

export function posixNormalize(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  const result: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (result.length > 0) result.pop();
      continue;
    }
    result.push(part);
  }
  return result.join('/') || '.';
}

export function extname(filePath: string): string {
  const base = filePath.replace(/\\/g, '/').split('/').pop() ?? '';
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(dot) : '';
}
