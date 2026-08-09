import { slugify } from '@archlens/core';
import { resolveContainerFromPath, type ResolveContainerOptions } from './containerGrouping.ts';

/** Node.js built-in modules that must not match local source files by basename. */
const NODE_BUILTIN_MODULES = new Set([
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'sys',
  'timers',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib',
]);

export function isRelativeImport(moduleSpecifier: string): boolean {
  return moduleSpecifier.startsWith('./') || moduleSpecifier.startsWith('../');
}

export function isNodeBuiltinModule(moduleSpecifier: string): boolean {
  const normalized = moduleSpecifier.startsWith('node:')
    ? moduleSpecifier.slice('node:'.length)
    : moduleSpecifier;
  const root = normalized.split('/')[0] ?? normalized;
  return NODE_BUILTIN_MODULES.has(root);
}

/**
 * Extract the npm package name from a module specifier (scoped or unscoped).
 * Returns null for relative imports.
 */
export function packageNameFromSpecifier(moduleSpecifier: string): string | null {
  if (isRelativeImport(moduleSpecifier)) return null;

  if (moduleSpecifier.startsWith('@')) {
    const parts = moduleSpecifier.split('/');
    if (parts.length < 2) return null;
    return `${parts[0]}/${parts[1]}`;
  }

  return moduleSpecifier.split('/')[0] || null;
}

export function resolveWorkspacePackageContainer(
  moduleSpecifier: string,
  packageIndex: ReadonlyMap<string, string>
): string | null {
  const packageName = packageNameFromSpecifier(moduleSpecifier);
  if (!packageName) return null;
  return packageIndex.get(packageName) ?? null;
}

/**
 * Repo-relative package directory for a workspace member source file
 * (e.g. `app/packages/canvas/src/App.tsx` → `app/packages/canvas`).
 */
export function packageDirFromSourcePath(
  relativePath: string,
  options: ResolveContainerOptions = {}
): string | null {
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const workspaceRoots = new Set(
    (options.workspacePackageRoots ?? ['packages', 'plugins', 'apps', 'libs', 'services']).map(r =>
      r.toLowerCase()
    )
  );

  const workspaceIdx = parts.findIndex(p => workspaceRoots.has(p.toLowerCase()));
  if (workspaceIdx < 0 || !parts[workspaceIdx + 1]) return null;

  const packageDir = parts.slice(0, workspaceIdx + 2).join('/');
  if (options.isPackageRoot && !options.isPackageRoot(packageDir)) return null;
  return packageDir;
}

/**
 * Build a lookup from declared package.json `name` to logical container id.
 */
/**
 * Detect package entry files (`src/index.ts`, etc.) and map container id → entry component slug.
 */
export function buildWorkspacePackageEntryIndex(
  sourcePaths: string[],
  options: ResolveContainerOptions = {}
): Map<string, string> {
  const index = new Map<string, string>();

  for (const relativePath of sourcePaths) {
    const normalized = relativePath.replace(/\\/g, '/');
    const entryMatch = normalized.match(/\/src\/index\.(t|j)sx?$/);
    if (!entryMatch) continue;

    const { containerId } = resolveContainerFromPath(normalized, options);
    index.set(containerId, 'index');
  }

  return index;
}

export function resolveWorkspacePackageEntryComponentId(
  containerId: string,
  entryIndex: ReadonlyMap<string, string> | undefined
): string {
  return entryIndex?.get(containerId) ?? 'index';
}

export function subpathComponentIdFromSpecifier(moduleSpecifier: string): string | null {
  if (isRelativeImport(moduleSpecifier)) return null;

  if (moduleSpecifier.startsWith('@')) {
    const parts = moduleSpecifier.split('/');
    if (parts.length <= 2) return null;
    const subpath = parts.slice(2).join('/');
    const leaf = subpath.split('/').pop();
    return leaf ? slugify(leaf.replace(/\.(ts|tsx|js|jsx)$/, '')) : null;
  }

  const parts = moduleSpecifier.split('/');
  if (parts.length <= 1) return null;
  const leaf = parts[parts.length - 1];
  return leaf ? slugify(leaf.replace(/\.(ts|tsx|js|jsx)$/, '')) : null;
}

export function buildWorkspacePackageIndex(
  sourcePaths: string[],
  options: ResolveContainerOptions,
  readPackageName: (packageDirRelative: string) => string | null
): Map<string, string> {
  const packageDirs = new Set<string>();
  for (const relativePath of sourcePaths) {
    const packageDir = packageDirFromSourcePath(relativePath, options);
    if (packageDir) packageDirs.add(packageDir);
  }

  const index = new Map<string, string>();
  for (const packageDir of packageDirs) {
    const packageName = readPackageName(packageDir);
    if (!packageName) continue;

    const { containerId } = resolveContainerFromPath(`${packageDir}/package.json`, options);
    index.set(packageName, containerId);
  }

  return index;
}

export function mergeContainerDependency(
  containerDependencies: { from: string; to: string; type: string }[],
  fromContainerRef: string,
  toContainerRef: string,
  type = 'inter-container'
): void {
  const edgeExists = containerDependencies.some(
    d => d.from === fromContainerRef && d.to === toContainerRef
  );
  if (!edgeExists) {
    containerDependencies.push({
      from: fromContainerRef,
      to: toContainerRef,
      type,
    });
  }
}
