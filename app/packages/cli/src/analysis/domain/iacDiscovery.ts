import type { AnalysisFileSystemPort } from './ports.ts';

export const IAC_SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.terraform',
  '.pulumi',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
]);

/** Slug from the last path segment (used for IaC roots and infra-repo scan roots). */
export function directorySlug(dirPath: string, fallback: string): string {
  const base = dirPath.replace(/\\/g, '/').replace(/\/$/, '').split('/').filter(Boolean).pop();
  if (!base) return fallback;
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback
  );
}

export function slugFromPath(rootPath: string, scanRoot: string, scanRootSlug: string): string {
  const normalizedRoot = rootPath.replace(/\\/g, '/').replace(/\/$/, '');
  const scanBase = scanRoot.replace(/\\/g, '/').replace(/\/$/, '');
  if (normalizedRoot === scanBase) return scanRootSlug;

  return directorySlug(normalizedRoot, scanRootSlug);
}

export function isUnder(parent: string, child: string): boolean {
  const p = parent.replace(/\\/g, '/').replace(/\/$/, '');
  const c = child.replace(/\\/g, '/').replace(/\/$/, '');
  return c === p || c.startsWith(`${p}/`);
}

/** Keep shallowest root when a nested directory would also match. */
export function dedupeNestedRootDirs(dirs: string[]): string[] {
  const sorted = [...dirs].sort((a, b) => a.length - b.length);
  const roots: string[] = [];
  for (const dir of sorted) {
    if (roots.some(r => isUnder(r, dir))) continue;
    roots.push(dir);
  }
  return roots;
}

export function walkForProjectRoots(
  scanRoot: string,
  fileSystem: AnalysisFileSystemPort,
  isProjectDir: (entryNames: string[]) => boolean,
  shouldSkipEntry: (name: string) => boolean
): string[] {
  const absScan = fileSystem.getAbsolutePath(scanRoot);
  if (!fileSystem.exists(absScan)) return [];

  const dirs: string[] = [];

  const walk = (dir: string): void => {
    const names = fileSystem.listDirectoryNames(dir);
    if (isProjectDir(names)) {
      dirs.push(dir);
    }

    for (const name of names) {
      if (IAC_SKIP_DIR_NAMES.has(name) || name.startsWith('.')) continue;
      if (shouldSkipEntry(name)) continue;
      walk(fileSystem.getAbsolutePath(dir, name));
    }
  };

  walk(absScan);
  return dedupeNestedRootDirs(dirs);
}
