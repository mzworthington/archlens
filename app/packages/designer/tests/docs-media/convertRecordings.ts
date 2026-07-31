import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
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

const designerRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const resultsRoot = path.join(designerRoot, 'test-results');

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
    convertWebmToGif(webm, docsGifPath(demo.gif), { trimBeforeSec });
    const sizeKb = Math.round(fs.statSync(docsGifPath(demo.gif)).size / 1024);
    console.log(`docs/screenshots/${demo.gif} (${sizeKb} KiB)`);
  }
}
