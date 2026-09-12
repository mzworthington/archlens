import { describe, it, expect, vi } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import {
  LITE_SCAN_MAX_ZIP_ARCHIVE_BYTES,
  pickZipArchive,
  walkZipArchive,
  ZIP_SCAN_INVALID_MESSAGE,
  ZIP_SCAN_TOO_LARGE_MESSAGE,
} from './zipSourceWalker';

function zipFile(files: Record<string, string>, name = 'repo.zip'): File {
  const zipped = zipSync(
    Object.fromEntries(Object.entries(files).map(([path, content]) => [path, strToU8(content)]))
  );
  return new File([zipped], name, { type: 'application/zip' });
}

describe('walkZipArchive', () => {
  it('collects the same sources, manifests and ignore rules as a folder scan', async () => {
    const result = await walkZipArchive(
      zipFile({
        'package.json': '{"name":"demo"}',
        'README.md': '# demo',
        'src/a.ts': 'export const a = 1;',
        'e2e/spec.ts': 'export const e2e = 1;',
        'node_modules/pkg/index.ts': 'export const skip = 1;',
        '__MACOSX/src/a.ts': 'export const mac = 1;',
      })
    );

    expect(result.files.map(f => f.relativePath).sort()).toEqual(['package.json', 'src/a.ts']);
    expect(result.sourceFileCount).toBe(1);
    expect(result.directoryName).toBe('repo');
    expect(result.truncated).toBe(false);
  });

  it('strips a single shared archive root before applying caps', async () => {
    const result = await walkZipArchive(
      zipFile({
        'demo-repo/package.json': '{"name":"demo-repo"}',
        'demo-repo/src/app.ts': 'export const app = 1;',
      })
    );

    expect(result.directoryName).toBe('demo-repo');
    expect(result.files.map(f => f.relativePath).sort()).toEqual(['package.json', 'src/app.ts']);
  });

  it('prefers src/ over peripheral scripts when the source cap is hit', async () => {
    const result = await walkZipArchive(
      zipFile({
        'tools/cli.ts': 'export const cli = 1;',
        'src/app.ts': 'export const app = 1;',
      }),
      { maxFiles: 1 }
    );

    expect(result.files.map(f => f.relativePath)).toEqual(['src/app.ts']);
    expect(result.truncationReasons).toContain('files');
  });

  it('stops and marks truncated once the cumulative byte budget is exhausted', async () => {
    const result = await walkZipArchive(
      zipFile({
        'a.ts': 'x'.repeat(60),
        'b.ts': 'y'.repeat(60),
        'c.ts': 'z'.repeat(60),
      }),
      { maxTotalBytes: 100 }
    );

    expect(result.truncated).toBe(true);
    expect(result.truncationReasons).toContain('bytes');
    expect(result.sourceFileCount).toBe(1);
  });

  it('drops path-traversal entries instead of escaping the scan root', async () => {
    const result = await walkZipArchive(
      zipFile({
        '../secret.ts': 'export const leaked = 1;',
        'src/a.ts': 'export const a = 1;',
      })
    );

    expect(result.files.map(f => f.relativePath)).toEqual(['src/a.ts']);
  });

  it('rejects a file that is not a valid ZIP', async () => {
    await expect(
      walkZipArchive(new File([new Uint8Array([1, 2, 3, 4])], 'nope.zip'))
    ).rejects.toMatchObject({ message: ZIP_SCAN_INVALID_MESSAGE });
  });

  it('rejects an archive that exceeds the compressed size cap', async () => {
    const oversized = new File([new Uint8Array(LITE_SCAN_MAX_ZIP_ARCHIVE_BYTES + 1)], 'huge.zip');
    await expect(walkZipArchive(oversized)).rejects.toMatchObject({
      message: ZIP_SCAN_TOO_LARGE_MESSAGE,
    });
  });

  it('aborts when the scan signal is cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      walkZipArchive(zipFile({ 'a.ts': 'export const a = 1;' }), { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'CancellationError' });
  });
});

describe('pickZipArchive', () => {
  it('reports cancelled when the file chooser is dismissed', async () => {
    const input = document.createElement('input');
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(input);

    const pending = pickZipArchive();
    input.dispatchEvent(new Event('cancel'));

    await expect(pending).resolves.toEqual({ status: 'cancelled' });
    createElement.mockRestore();
  });
});
