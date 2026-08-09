import { describe, it, expect, vi } from 'vitest';
import { BrowserTreeSitterParser } from './browserTreeSitterParser';

function emptyTree(deleteTree: () => void) {
  return {
    rootNode: {
      type: 'program',
      text: '',
      childCount: 0,
      children: [],
      child: () => null,
      childForFieldName: () => null,
      descendantsOfType: () => [],
    },
    delete: deleteTree,
  };
}

describe('BrowserTreeSitterParser', () => {
  it('falls back to lightweight parsing when tree-sitter init fails', async () => {
    const parser = new BrowserTreeSitterParser(
      [{ relativePath: 'src/a.ts', content: "import { b } from './b';\n" }],
      '/scan',
      undefined,
      { init: async () => false }
    );

    const files = await parser.parseSourceFiles('**/*.{ts,tsx}');
    expect(files).toHaveLength(1);
    expect(files[0]?.imports).toEqual([{ moduleSpecifier: './b' }]);
    expect(files[0]?.newExpressions).toEqual([]);
  });

  it('falls back per file when a language fails to load', async () => {
    const warn = vi.fn();
    const parser = new BrowserTreeSitterParser(
      [{ relativePath: 'src/a.ts', content: "import { b } from './b';\n" }],
      '/scan',
      { warn },
      {
        init: async () => true,
        loadLanguageForFile: async () => null,
      }
    );

    const files = await parser.parseSourceFiles('**/*.{ts,tsx}');
    expect(files[0]?.imports).toEqual([{ moduleSpecifier: './b' }]);
    expect(warn).toHaveBeenCalled();
  });

  it('parses with the injected runtime and deletes trees after success', async () => {
    const deleteTree = vi.fn();
    const setLanguage = vi.fn();
    const parse = vi.fn(() => emptyTree(deleteTree));

    const parser = new BrowserTreeSitterParser(
      [{ relativePath: 'src/a.ts', content: "import { b } from './b';\n" }],
      '/scan',
      undefined,
      {
        init: async () => true,
        loadLanguageForFile: async () => ({ language: {} }),
        createParser: () => ({ setLanguage, parse }),
      }
    );
    const files = await parser.parseSourceFiles('**/*.{ts,tsx}');

    expect(setLanguage).toHaveBeenCalled();
    expect(parse).toHaveBeenCalled();
    expect(files).toHaveLength(1);
    expect(files[0]?.relativePath).toBe('src/a.ts');
    expect(deleteTree).toHaveBeenCalledTimes(1);
  });

  it('falls back per file when parse throws', async () => {
    const parser = new BrowserTreeSitterParser(
      [{ relativePath: 'src/a.ts', content: "import { b } from './b';\n" }],
      '/scan',
      undefined,
      {
        init: async () => true,
        loadLanguageForFile: async () => ({ language: {} }),
        createParser: () => ({
          setLanguage: vi.fn(),
          parse: () => {
            throw new Error('parse failed');
          },
        }),
      }
    );
    const files = await parser.parseSourceFiles('**/*.{ts,tsx}');

    expect(files[0]?.imports).toEqual([{ moduleSpecifier: './b' }]);
    expect(files[0]?.newExpressions).toEqual([]);
  });
});
