import { describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';
import { walkBrowserSourceZip } from './walkBrowserSourceZip';

function zipFile(files: Record<string, string>, name = 'upload.zip'): File {
  const encoder = new TextEncoder();
  const zippable: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) {
    zippable[path] = encoder.encode(content);
  }
  return new File([zipSync(zippable)], name, { type: 'application/zip' });
}

describe('walkBrowserSourceZip', () => {
  it('strips a wrapping folder and applies folder-scan ignore rules', async () => {
    const result = await walkBrowserSourceZip(
      zipFile({
        'checkout/.gitignore': 'ignored/\n',
        'checkout/package.json': '{"name":"demo"}\n',
        'checkout/src/a.ts': 'export const a = 1;\n',
        'checkout/ignored/skip.ts': 'export const skip = 1;\n',
        'checkout/e2e/spec.ts': 'export const e2e = 1;\n',
        'checkout/node_modules/pkg/index.ts': 'export const n = 1;\n',
      })
    );

    expect(result.directoryName).toBe('checkout');
    expect(result.files.map(file => file.relativePath).sort()).toEqual([
      'package.json',
      'src/a.ts',
    ]);
    expect(result.sourceFileCount).toBe(1);
  });

  it('uses the zip filename when files sit at the archive root', async () => {
    const result = await walkBrowserSourceZip(
      zipFile(
        {
          'src/a.ts': 'export const a = 1;\n',
        },
        'demo-repo.zip'
      )
    );

    expect(result.directoryName).toBe('demo-repo');
    expect(result.files.map(file => file.relativePath)).toEqual(['src/a.ts']);
  });
});
