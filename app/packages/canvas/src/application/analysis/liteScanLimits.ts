/** Caps for in-browser structural scan (no git / no CLI parity). */
export const LITE_SCAN_MAX_FILES = 300;
export const LITE_SCAN_MAX_FILE_BYTES = 512_000;
/** Cumulative read budget — sources are structured-cloned into the analysis worker. */
export const LITE_SCAN_MAX_TOTAL_BYTES = 8_000_000;
export const LITE_SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

/** Manifests the analyzer reads for naming and workspace-package discovery. */
export const LITE_SCAN_METADATA_FILES = new Set(['package.json', 'pnpm-workspace.yaml']);
/** Metadata has its own budget so manifests cannot crowd out source files. */
export const LITE_SCAN_MAX_METADATA_FILES = 100;

/** Directory names skipped while walking a source tree. */
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

function extensionOf(pathOrName: string): string {
  const idx = pathOrName.lastIndexOf('.');
  return idx >= 0 ? pathOrName.slice(idx).toLowerCase() : '';
}

/** Single source-of-truth for what the browser scan treats as parseable source. */
export function isLiteScanSourcePath(relativePath: string): boolean {
  return LITE_SCAN_EXTENSIONS.has(extensionOf(relativePath));
}

/** Manifest files read by the analyzer but never parsed as source. */
export function isLiteScanMetadataPath(relativePath: string): boolean {
  const name = relativePath.replace(/\\/g, '/').split('/').pop() ?? relativePath;
  return LITE_SCAN_METADATA_FILES.has(name);
}
