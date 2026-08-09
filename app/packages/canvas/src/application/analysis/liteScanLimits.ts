/** Caps for in-browser structural scan (no git / no CLI parity). */
export const LITE_SCAN_MAX_FILES = 300;
export const LITE_SCAN_MAX_FILE_BYTES = 512_000;
export const LITE_SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

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
