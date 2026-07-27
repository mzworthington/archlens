import { accessSync, constants, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RECORDING_TRIM_FILE = 'recording-trim.json';

const designerRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const REPO_ROOT = path.resolve(designerRoot, '../../..');
export const DOCS_SCREENSHOTS_DIR = path.join(REPO_ROOT, 'docs/screenshots');

export const RECORD_DOCS_MEDIA = process.env.RECORD_DOCS_MEDIA === '1';

export function docsGifPath(fileName: string): string {
  return path.join(DOCS_SCREENSHOTS_DIR, fileName);
}

export function hasBinary(name: string): boolean {
  const pathEnv = process.env.PATH ?? '';
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    try {
      accessSync(path.join(dir, name), constants.X_OK);
      return true;
    } catch {
      // try next PATH entry
    }
  }
  return false;
}

export function requireDocsMediaBinaries(): void {
  const missing = ['ffmpeg'].filter(name => !hasBinary(name));
  if (missing.length > 0) {
    throw new Error(
      `Missing required binaries for docs media recording: ${missing.join(', ')}. ` +
        'Install with: mise install (see mise.toml)'
    );
  }
}

export function writeRecordingTrimMarker(outputDir: string, trimBeforeSec: number): void {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    path.join(outputDir, RECORDING_TRIM_FILE),
    `${JSON.stringify({ trimBeforeSec }, null, 2)}\n`
  );
}

export function readRecordingTrimMarker(outputDir: string): number | undefined {
  const trimPath = path.join(outputDir, RECORDING_TRIM_FILE);
  try {
    const parsed = JSON.parse(readFileSync(trimPath, 'utf8')) as { trimBeforeSec?: number };
    return typeof parsed.trimBeforeSec === 'number' && parsed.trimBeforeSec > 0
      ? parsed.trimBeforeSec
      : undefined;
  } catch {
    return undefined;
  }
}

/** Convert a Playwright WebM capture into a looping GIF for product guides. */
export function convertWebmToGif(
  webmPath: string,
  gifPath: string,
  options?: { trimBeforeSec?: number }
): void {
  const trimBeforeSec = options?.trimBeforeSec ?? 0;
  mkdirSync(path.dirname(gifPath), { recursive: true });
  rmSync(gifPath, { force: true });
  const inputArgs =
    trimBeforeSec > 0 ? ['-ss', String(trimBeforeSec), '-i', webmPath] : ['-i', webmPath];
  execFileSync(
    'ffmpeg',
    [
      '-y',
      ...inputArgs,
      '-filter_complex',
      '[0:v]fps=12,scale=1100:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
      '-loop',
      '0',
      gifPath,
    ],
    { stdio: 'inherit' }
  );
}
