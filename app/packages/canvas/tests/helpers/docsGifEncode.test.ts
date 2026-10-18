import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { shouldCopyDocsAsset } from '../../vite/syncDocsAssets';
import {
  assertDocsGifWithinBudget,
  DOCS_GIF_FPS,
  DOCS_GIF_MAX_BYTES,
  DOCS_GIF_WIDTH,
  docsGifFilter,
} from './docsMedia';

describe('guide GIF encode budget', () => {
  it('scales to 1280 at 8 fps with a diff palette and ordered dither', () => {
    const filter = docsGifFilter(DOCS_GIF_WIDTH);
    expect(filter).toContain('fps=8');
    expect(filter).toContain('scale=1280:-1:flags=lanczos');
    expect(filter).toContain('palettegen=stats_mode=diff:max_colors=128');
    expect(filter).toContain('paletteuse=dither=bayer:bayer_scale=3');
    expect(DOCS_GIF_FPS).toBe(8);
  });

  it('rejects a GIF over the 20 MiB Pages budget', () => {
    expect(() => assertDocsGifWithinBudget('canvas-tour.gif', DOCS_GIF_MAX_BYTES)).not.toThrow();
    expect(() => assertDocsGifWithinBudget('canvas-tour.gif', DOCS_GIF_MAX_BYTES + 1)).toThrow(
      /20 MiB guide GIF budget/
    );
  });

  it('is ignored by Playwright, which collects every *.test.ts under tests/', () => {
    const configPath = join(dirname(fileURLToPath(import.meta.url)), '../../playwright.config.ts');
    expect(readFileSync(configPath, 'utf8')).toContain("'**/*.test.ts'");
  });

  it('leaves GIFs out of the Pages dist once the media host is configured', () => {
    expect(shouldCopyDocsAsset('canvas-tour.gif', '')).toBe(true);
    expect(shouldCopyDocsAsset('canvas-tour.gif', 'https://media.archlens.dev/guides')).toBe(false);
    expect(shouldCopyDocsAsset('1-panels-expanded.png', 'https://media.archlens.dev/guides')).toBe(
      true
    );
  });
});
