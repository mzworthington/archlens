import { describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';
import {
  ZIP_SCAN_INVALID_MESSAGE,
  ZIP_SCAN_TOO_LARGE_MESSAGE,
  ZipScanError,
  unzipLiteScanArchive,
} from './unzipLiteScanArchive';

function zipFiles(files: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder();
  const zippable: Record<string, Uint8Array> = {};
  for (const [name, content] of Object.entries(files)) {
    zippable[name] = encoder.encode(content);
  }
  return zipSync(zippable);
}

describe('unzipLiteScanArchive', () => {
  it('reads repository files from a valid ZIP', () => {
    const bytes = zipFiles({
      'demo-repo/src/a.ts': 'export const a = 1;\n',
      'demo-repo/package.json': '{"name":"demo"}\n',
    });

    const entries = unzipLiteScanArchive(bytes);
    expect(entries.map(e => e.relativePath).sort()).toEqual([
      'demo-repo/package.json',
      'demo-repo/src/a.ts',
    ]);
    expect(entries.find(e => e.relativePath.endsWith('a.ts'))?.content).toContain('export const a');
  });

  it('rejects bytes that are not a ZIP', () => {
    expect(() => unzipLiteScanArchive(new Uint8Array([1, 2, 3, 4]))).toThrow(ZipScanError);
    try {
      unzipLiteScanArchive(new Uint8Array([1, 2, 3, 4]));
    } catch (error) {
      expect(error).toBeInstanceOf(ZipScanError);
      expect((error as ZipScanError).message).toBe(ZIP_SCAN_INVALID_MESSAGE);
    }
  });

  it('rejects archives whose paths escape the zip root', () => {
    const bytes = zipFiles({ '../escape.ts': 'export const escape = 1;\n' });
    expect(() => unzipLiteScanArchive(bytes)).toThrow(ZipScanError);
    try {
      unzipLiteScanArchive(bytes);
    } catch (error) {
      expect((error as ZipScanError).message).toBe(ZIP_SCAN_INVALID_MESSAGE);
    }
  });

  it('rejects an archive larger than the in-tab byte budget', () => {
    const bytes = zipFiles({ 'src/a.ts': 'export const a = 1;\n' });
    expect(() => unzipLiteScanArchive(bytes, { maxTotalBytes: 2 })).toThrow(ZipScanError);
    try {
      unzipLiteScanArchive(bytes, { maxTotalBytes: 2 });
    } catch (error) {
      expect((error as ZipScanError).message).toBe(ZIP_SCAN_TOO_LARGE_MESSAGE);
    }
  });
});
