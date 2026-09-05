import fs from 'fs';
import path from 'path';

export interface ParsedGlobPattern {
  dir: string;
  extensions: string[];
}

/**
 * Parse a brace-expansion glob into a base directory and extensions.
 */
export function parseForensicsGlobPattern(cwd: string, pattern: string): ParsedGlobPattern {
  const resolvedPattern = path.resolve(cwd, pattern);
  const baseDir = resolvedPattern.split('**')[0].replace(/\/$/, '').replace(/\\$/, '');

  const extMatch = resolvedPattern.match(/\{([^}]+)\}/);
  let extensions: string[] = [];
  if (extMatch) {
    extensions = extMatch[1].split(',').map(e => '.' + e.trim().replace(/^\./, ''));
  } else {
    const singleExtMatch = resolvedPattern.match(/\.([a-zA-Z0-9]+)$/);
    if (singleExtMatch) {
      extensions = ['.' + singleExtMatch[1]];
    }
  }

  if (extensions.length === 0) {
    extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.cs'];
  }

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

/**
 * List files under `cwd` matching the glob pattern, returning repo-relative posix paths.
 */
export function listFilesForGlob(
  cwd: string,
  pattern: string,
  shouldSkip: (relativePath: string) => boolean
): string[] {
  const { dir, extensions } = parseForensicsGlobPattern(cwd, pattern);
  const results: string[] = [];
  walkDirectory(dir, cwd, extensions, shouldSkip, results);
  return results.sort();
}
