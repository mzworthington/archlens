import { describe, expect, it } from 'vitest';
import {
  TRACE_LENS_BROWSER_SCAN_EMPTY,
  TRACE_LENS_FOLDER_MISSING_FORENSICS,
  traceLensMissingForensicsCopy,
} from './traceLensBrowserScanCopy';

describe('traceLensMissingForensicsCopy', () => {
  it('does not tell a browser-scan workspace that git hotspots exist in this tab', () => {
    const copy = traceLensMissingForensicsCopy(true);
    expect(copy).toBe(TRACE_LENS_BROWSER_SCAN_EMPTY);
    expect(copy.toLowerCase()).not.toMatch(/hotspot/);
    expect(copy.toLowerCase()).not.toMatch(/re-scan with git/);
  });

  it('keeps the CLI enrich hint for ordinary folders without TraceLens blocks', () => {
    expect(traceLensMissingForensicsCopy(false)).toBe(TRACE_LENS_FOLDER_MISSING_FORENSICS);
  });
});
