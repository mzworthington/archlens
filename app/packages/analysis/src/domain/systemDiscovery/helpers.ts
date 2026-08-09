import type { SystemDiscoveryFs } from './types.ts';

/** Root dirs never promoted to standalone systems. */
export const STANDALONE_DENYLIST = new Set([
  'node_modules',
  '.git',
  '.github',
  '.husky',
  '.vscode',
  '.idea',
  'dist',
  'build',
  'out',
  'coverage',
  'docs',
  'documentation',
  'scripts',
  'e2e',
  'cypress',
  'playwright',
  'blueprints',
  'tmp',
  'temp',
]);

export function titleCase(name: string): string {
  if (!name) return 'App';
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Extract unique first path segments from workspace globs.
 * `packages/*` → `packages`, `apps/web/*` → `apps` (first segment only for multi-system split).
 */
export function workspaceRootsFromGlobs(globs: string[]): string[] {
  const roots = new Set<string>();
  for (const raw of globs) {
    const cleaned = raw.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
    const first = cleaned.split('/').filter(Boolean)[0];
    if (!first || first.includes('*')) continue;
    roots.add(first);
  }
  return [...roots];
}

export function parseNpmWorkspaces(packageJsonText: string): string[] {
  try {
    const pkg = JSON.parse(packageJsonText) as {
      workspaces?: string[] | { packages?: string[] };
    };
    if (Array.isArray(pkg.workspaces)) return pkg.workspaces;
    if (pkg.workspaces && Array.isArray(pkg.workspaces.packages)) {
      return pkg.workspaces.packages;
    }
  } catch {
    // ignore
  }
  return [];
}

export function parsePnpmWorkspacePackages(yamlText: string): string[] {
  const packages: string[] = [];
  let inPackages = false;
  for (const line of yamlText.split(/\r?\n/)) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      if (/^\S/.test(line) && !line.trim().startsWith('#')) {
        inPackages = false;
        continue;
      }
      const match = line.match(/^\s*-\s*['"]?([^'"#]+)['"]?\s*$/);
      if (match) packages.push(match[1].trim());
    }
  }
  return packages;
}

export function readWorkspaceGlobs(cwd: string, fs: SystemDiscoveryFs): string[] {
  const pkgPath = fs.getAbsolutePath(cwd, 'package.json');
  if (fs.exists(pkgPath)) {
    const text = fs.readText(pkgPath);
    if (text) {
      const fromNpm = parseNpmWorkspaces(text);
      if (fromNpm.length > 0) return fromNpm;
    }
  }

  const pnpmPath = fs.getAbsolutePath(cwd, 'pnpm-workspace.yaml');
  if (fs.exists(pnpmPath)) {
    const text = fs.readText(pnpmPath);
    if (text) return parsePnpmWorkspacePackages(text);
  }

  return [];
}

export function readPackageName(cwd: string, fs: SystemDiscoveryFs): string | undefined {
  const candidates = ['package.json', 'app/package.json'];
  for (const relativePath of candidates) {
    const pkgPath = fs.getAbsolutePath(cwd, relativePath);
    if (!fs.exists(pkgPath)) continue;
    const text = fs.readText(pkgPath);
    if (!text) continue;
    try {
      const name = JSON.parse(text).name as string | undefined;
      if (!name || name === 'root') continue;
      return name.includes('/') ? name.split('/').pop() : name;
    } catch {
      // try next candidate
    }
  }
  return undefined;
}
