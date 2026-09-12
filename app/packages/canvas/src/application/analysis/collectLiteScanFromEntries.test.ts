import { describe, expect, it } from 'vitest';
import { collectLiteScanFromEntries, stripSharedArchiveRoot } from './collectLiteScanFromEntries';

function entry(relativePath: string, content: string) {
  return { relativePath, content, size: content.length };
}

describe('stripSharedArchiveRoot', () => {
  it('strips a single wrapping folder from a ZIP listing', () => {
    const { directoryName, relativize } = stripSharedArchiveRoot([
      'demo-repo/src/a.ts',
      'demo-repo/package.json',
    ]);
    expect(directoryName).toBe('demo-repo');
    expect(relativize('demo-repo/src/a.ts')).toBe('src/a.ts');
  });

  it('does not strip a src/ tree that is the project layout', () => {
    const { directoryName, relativize } = stripSharedArchiveRoot(['src/a.ts', 'src/b.ts']);
    expect(directoryName).toBeNull();
    expect(relativize('src/a.ts')).toBe('src/a.ts');
  });

  it('does not strip when files sit at the archive root', () => {
    const { directoryName, relativize } = stripSharedArchiveRoot(['src/a.ts', 'package.json']);
    expect(directoryName).toBeNull();
    expect(relativize('src/a.ts')).toBe('src/a.ts');
  });
});

describe('collectLiteScanFromEntries', () => {
  it('names the scan after a wrapping checkout folder', () => {
    const result = collectLiteScanFromEntries(
      [entry('checkout/src/a.ts', 'export const a = 1;'), entry('checkout/package.json', '{}')],
      { directoryName: 'upload.zip' }
    );
    expect(result.directoryName).toBe('checkout');
    expect(result.files.map(file => file.relativePath).sort()).toEqual([
      'package.json',
      'src/a.ts',
    ]);
  });

  it('drops zip-slip and node_modules paths', () => {
    const result = collectLiteScanFromEntries(
      [
        entry('../escape.ts', 'export const escape = 1;'),
        entry('node_modules/pkg/index.ts', 'export const n = 1;'),
        entry('src/ok.ts', 'export const ok = 1;'),
      ],
      { directoryName: 'demo-repo' }
    );
    expect(result.files.map(file => file.relativePath)).toEqual(['src/ok.ts']);
  });
});
