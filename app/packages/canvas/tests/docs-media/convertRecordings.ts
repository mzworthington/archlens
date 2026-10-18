import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertDocsGifWithinBudget,
  convertWebmToGif,
  docsGifPath,
  readRecordingTrimMarker,
  requireDocsMediaBinaries,
} from '../helpers/docsMedia';

const DEMOS = [
  { dirSuffix: 'golden-journey-gif', gif: 'golden-journey.gif' },
  { dirSuffix: 'chaoslens-gif', gif: 'chaoslens.gif' },
  { dirSuffix: 'tracelens-gif', gif: 'tracelens.gif' },
  { dirSuffix: 'canvas-tour-gif', gif: 'canvas-tour.gif' },
] as const;

const canvasRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const resultsRoot = path.join(canvasRoot, 'test-results');

function findResultDir(suffix: string): string | null {
  if (!fs.existsSync(resultsRoot)) return null;
  for (const name of fs.readdirSync(resultsRoot)) {
    if (name.includes(suffix)) return path.join(resultsRoot, name);
  }
  return null;
}

/** Convert Playwright test-results videos to docs/screenshots GIFs. */
export function convertAllRecordings(): void {
  requireDocsMediaBinaries();

  for (const demo of DEMOS) {
    const dir = findResultDir(demo.dirSuffix);
    if (!dir) {
      throw new Error(
        `Missing Playwright output for ${demo.gif} (expected test-results/*${demo.dirSuffix}*/video.webm). ` +
          'Run the docs-media Playwright suite first.'
      );
    }

    const webm = path.join(dir, 'video.webm');
    if (!fs.existsSync(webm)) {
      throw new Error(`Missing video capture at ${webm}`);
    }

    const trimBeforeSec = readRecordingTrimMarker(dir);
    const gifPath = docsGifPath(demo.gif);
    convertWebmToGif(webm, gifPath, { trimBeforeSec });
    const sizeBytes = fs.statSync(gifPath).size;
    assertDocsGifWithinBudget(gifPath, sizeBytes);
    const sizeKb = Math.round(sizeBytes / 1024);
    console.log(`docs/screenshots/${demo.gif} (${sizeKb} KiB)`);
  }
}
