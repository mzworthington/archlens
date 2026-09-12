import { describe, expect, it } from 'vitest';
import {
  TRACE_LENS_BROWSER_SCAN_GIT_FAILED,
  TRACE_LENS_BROWSER_SCAN_NO_GIT,
  TRACE_LENS_FOLDER_MISSING_FORENSICS,
  browserScanReadyMessage,
  traceLensMissingForensicsCopy,
} from './traceLensBrowserScanCopy';

describe('traceLensMissingForensicsCopy', () => {
  it('tells a browser-scan workspace the folder has no git rather than that the tab cannot do git', () => {
    const copy = traceLensMissingForensicsCopy(true, 'missing');
    expect(copy).toBe(TRACE_LENS_BROWSER_SCAN_NO_GIT);
    expect(copy.toLowerCase()).not.toMatch(/structure-only/);
    expect(copy.toLowerCase()).not.toMatch(/re-scan with git/);
    expect(copy.toLowerCase()).not.toMatch(/ci publish in the browser/);
  });

  it('explains a failed git read without claiming CI publish', () => {
    expect(traceLensMissingForensicsCopy(true, 'failed')).toBe(TRACE_LENS_BROWSER_SCAN_GIT_FAILED);
  });

  it('keeps the CLI enrich hint for ordinary folders without TraceLens blocks', () => {
    expect(traceLensMissingForensicsCopy(false)).toBe(TRACE_LENS_FOLDER_MISSING_FORENSICS);
  });
});

describe('browserScanReadyMessage', () => {
  it('announces git hotspots when history was attached', () => {
    const message = browserScanReadyMessage({
      sourceFileCount: 2,
      iacFileCount: 1,
      truncatedNote: '',
      gitStatus: 'included',
    });
    expect(message).toMatch(/TraceLens git hotspots are included/);
    expect(message).toMatch(/watch mode and CI publish/);
    expect(message.toLowerCase()).not.toContain('structure only');
  });

  it('says this folder has no git history without claiming the tab cannot do git', () => {
    const message = browserScanReadyMessage({
      sourceFileCount: 3,
      iacFileCount: 0,
      truncatedNote: '',
      gitStatus: 'missing',
    });
    expect(message).toMatch(/This folder has no git history/);
    expect(message.toLowerCase()).not.toMatch(/cannot do git/);
    expect(message.toLowerCase()).not.toContain('structure only');
    expect(message).toMatch(/watch mode and CI publish/);
  });
});
