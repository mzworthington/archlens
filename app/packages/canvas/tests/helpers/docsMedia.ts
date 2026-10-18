import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RECORDING_TRIM_FILE = 'recording-trim.json';

const canvasRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REPO_ROOT = path.resolve(canvasRoot, '../../..');
const DOCS_SCREENSHOTS_DIR = path.join(REPO_ROOT, 'docs/screenshots');

export const RECORD_DOCS_MEDIA = process.env.RECORD_DOCS_MEDIA === '1';

export function docsScreenshotPath(fileName: string): string {
  return path.join(DOCS_SCREENSHOTS_DIR, fileName);
}

export function docsGifPath(fileName: string): string {
  return docsScreenshotPath(fileName);
}

function hasBinary(name: string): boolean {
  const pathEnv = process.env.PATH ?? '';
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    try {
      accessSync(path.join(dir, name), constants.X_OK);
      return true;
    } catch {}
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

/**
 * Guide GIF width. Source captures are 2880×1864. 1280 keeps UI text readable
 * and stays under the Cloudflare Pages 25 MiB per-file limit.
 */
export const DOCS_GIF_WIDTH = 1280;

export const DOCS_GIF_FPS = 8;

const DOCS_GIF_MAX_COLORS = 128;

/** Stay under the Pages 25 MiB file cap with room for a longer recording. */
export const DOCS_GIF_MAX_BYTES = 20 * 1024 * 1024;

/**
 * Ordered Bayer dither and a diff palette compress flat UI much better than
 * full-frame sierra2_4a, which turns small capture noise into a new pixel every frame.
 */
export function docsGifFilter(width: number): string {
  return (
    `[0:v]fps=${DOCS_GIF_FPS},scale=${width}:-1:flags=lanczos,split[s0][s1];` +
    `[s0]palettegen=stats_mode=diff:max_colors=${DOCS_GIF_MAX_COLORS}[p];` +
    `[s1][p]paletteuse=dither=bayer:bayer_scale=3`
  );
}

export function assertDocsGifWithinBudget(gifPath: string, sizeBytes: number): void {
  if (sizeBytes <= DOCS_GIF_MAX_BYTES) return;
  const mib = (sizeBytes / 1024 / 1024).toFixed(1);
  const budgetMib = DOCS_GIF_MAX_BYTES / 1024 / 1024;
  throw new Error(
    `${gifPath} is ${mib} MiB, over the ${budgetMib} MiB guide GIF budget. ` +
      'Cloudflare Pages rejects a single file over 25 MiB.'
  );
}

/** Convert a Playwright WebM capture into a looping GIF for product guides. */
export function convertWebmToGif(
  webmPath: string,
  gifPath: string,
  options?: { trimBeforeSec?: number; width?: number }
): void {
  const trimBeforeSec = options?.trimBeforeSec ?? 0;
  const width = options?.width ?? DOCS_GIF_WIDTH;
  mkdirSync(path.dirname(gifPath), { recursive: true });
  rmSync(gifPath, { force: true });
  const inputArgs =
    trimBeforeSec > 0 ? ['-ss', String(trimBeforeSec), '-i', webmPath] : ['-i', webmPath];
  const filter = docsGifFilter(width);
  execFileSync(
    ffmpegBin(),
    ['-y', ...inputArgs, '-filter_complex', filter, '-loop', '0', gifPath],
    {
      stdio: 'inherit',
      env: { ...process.env, PATH: '/usr/bin:/bin' },
    }
  );
}

function ffmpegBin(): string {
  for (const candidate of ['/usr/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg']) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('ffmpeg not found in a fixed directory');
}
