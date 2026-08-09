const PULUMI_PROJECT_FILE = /^pulumi\.ya?ml$/i;

/** Caps for in-browser structural scan (no git / no CLI parity). */
export const LITE_SCAN_MAX_FILES = 300;
export const LITE_SCAN_MAX_FILE_BYTES = 512_000;
/** Cumulative read budget - sources are structured-cloned into the analysis worker. */
export const LITE_SCAN_MAX_TOTAL_BYTES = 8_000_000;
/**
 * Source extensions for browser structural scan (application languages).
 * Align with CLI languages and `extensionToTreeSitterLanguage` in `@archlens/core`.
 * Terraform/Pulumi are collected separately via `isLiteScanIacPath` for `IacAnalyzer`.
 */
export const LITE_SCAN_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.go',
  '.java',
  '.cs',
]);

/** Extensions that the lightweight regex fallback can extract imports from. */
export const LITE_SCAN_JS_TS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

/** Manifests the analyzer reads for naming and workspace-package discovery. */
export const LITE_SCAN_METADATA_FILES = new Set(['package.json', 'pnpm-workspace.yaml']);
/** Metadata has its own budget so manifests cannot crowd out source files. */
export const LITE_SCAN_MAX_METADATA_FILES = 100;

/** Directory names skipped while walking a source tree (plus structural ignore globs). */
export const LITE_SCAN_SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  '.hg',
  '.svn',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.turbo',
  '.cache',
  'vendor',
  'target',
  '__pycache__',
  '.venv',
  'venv',
]);

export type LiteScanTruncationReason = 'files' | 'bytes' | 'metadata';

function extensionOf(pathOrName: string): string {
  const normalized = pathOrName.replace(/\\/g, '/');
  if (normalized.endsWith('.d.ts')) return '.d.ts';
  if (normalized.toLowerCase().endsWith('.tf.json')) return '.tf.json';
  const idx = normalized.lastIndexOf('.');
  return idx >= 0 ? normalized.slice(idx).toLowerCase() : '';
}

function baseName(relativePath: string): string {
  return relativePath.replace(/\\/g, '/').split('/').pop() ?? relativePath;
}

/** Single source-of-truth for what the browser scan treats as parseable application source. */
export function isLiteScanSourcePath(relativePath: string): boolean {
  const ext = extensionOf(relativePath);
  if (ext === '.d.ts') return false;
  return LITE_SCAN_EXTENSIONS.has(ext);
}

/** True when the lightweight JS/TS specifier extractor can safely run. */
export function isLiteScanJsTsPath(relativePath: string): boolean {
  const ext = extensionOf(relativePath);
  if (ext === '.d.ts') return false;
  return LITE_SCAN_JS_TS_EXTENSIONS.has(ext);
}

/** Manifest files read by the analyzer but never parsed as source. */
export function isLiteScanMetadataPath(relativePath: string): boolean {
  const name = baseName(relativePath);
  if (LITE_SCAN_METADATA_FILES.has(name)) return true;
  // C# ProjectReference edges need .csproj content in the memory filesystem.
  return name.toLowerCase().endsWith('.csproj');
}

/**
 * Terraform / Pulumi inputs for the browser `IacAnalyzer` pass.
 * Kept out of `isLiteScanSourcePath` so AST parsers do not treat HCL as app code.
 */
export function isLiteScanIacPath(relativePath: string): boolean {
  const name = baseName(relativePath);
  if (PULUMI_PROJECT_FILE.test(name)) return true;
  const ext = extensionOf(relativePath);
  return ext === '.tf' || ext === '.tf.json';
}

export function isLiteScanPulumiProjectPath(relativePath: string): boolean {
  return PULUMI_PROJECT_FILE.test(baseName(relativePath));
}

/** Sibling YAML next to a Pulumi project file (yaml-runtime program fragments). */
export function isLiteScanPulumiYamlProgramPath(relativePath: string): boolean {
  const name = baseName(relativePath);
  if (PULUMI_PROJECT_FILE.test(name)) return false;
  if (isLiteScanMetadataPath(relativePath)) return false;
  return /\.ya?ml$/i.test(name);
}

/**
 * Lower is better. Prefer application source roots when the file cap is hit so
 * FS enumeration order does not starve `src/` for peripheral scripts.
 */
export function liteScanSourcePriority(relativePath: string): number {
  const path = relativePath.replace(/\\/g, '/');
  if (/(?:^|\/)(?:src|app)\//.test(path)) return 0;
  if (/(?:^|\/)packages\/[^/]+\/src\//.test(path)) return 0;
  return 1;
}

/** Prefer infra roots when the shared file cap is hit. */
export function liteScanIacPriority(relativePath: string): number {
  const path = relativePath.replace(/\\/g, '/');
  if (/(?:^|\/)(?:infra|infrastructure|terraform|pulumi)\//.test(path)) return 0;
  return 1;
}

/** Prefer root manifests over nested package.json copies when metadata is capped. */
export function liteScanMetadataPriority(relativePath: string): number {
  const path = relativePath.replace(/\\/g, '/');
  if (path === 'package.json' || path === 'pnpm-workspace.yaml') return 0;
  if (!path.includes('/')) return 1;
  return 2;
}
