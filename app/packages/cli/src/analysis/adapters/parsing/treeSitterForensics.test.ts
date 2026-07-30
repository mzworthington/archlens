import Parser from 'web-tree-sitter';
import { describe, expect, it } from 'vitest';
import { TreeSitterWasmLoader } from './treeSitterLoader.ts';
import {
  collectFunctionComplexitySlices,
  extractRelativeImportsFromTree,
  TreeSitterScanCache,
} from './treeSitterForensics.ts';

async function parseSource(
  ext: string,
  source: string
): Promise<{ root: Parser.SyntaxNode; tree: Parser.Tree }> {
  await TreeSitterWasmLoader.ensureInitialized();
  const loader = new TreeSitterWasmLoader();
  const language = await loader.getLanguageForExtension(ext);
  if (!language) {
    throw new Error(`Missing tree-sitter grammar for ${ext}`);
  }
  const parser = new Parser();
  parser.setLanguage(language);
  const tree = parser.parse(source);
  return { root: tree.rootNode, tree };
}

describe('extractRelativeImportsFromTree', () => {
  it('collects relative TypeScript import specifiers', async () => {
    const { root } = await parseSource(
      '.ts',
      `
import { x } from './util';
import abs from 'react';
export { y } from '../shared';
`
    );

    expect(extractRelativeImportsFromTree('.ts', root).sort()).toEqual(['../shared', './util']);
  });

  it('collects relative Python import_from specifiers', async () => {
    const { root } = await parseSource('.py', 'from .local import helper\nimport os');

    expect(extractRelativeImportsFromTree('.py', root).sort()).toEqual(['.local']);
  });
});

describe('collectFunctionComplexitySlices', () => {
  it('splits TypeScript methods into per-function AST slices', async () => {
    const { root } = await parseSource(
      '.ts',
      `
function outer() {
  if (true) {}
}
const inner = () => {
  while (false) {}
};
`
    );

    const slices = collectFunctionComplexitySlices(root, 'typescript');
    expect(slices).toHaveLength(2);
    expect(slices.every(slice => slice.length > 0)).toBe(true);
  });
});

describe('TreeSitterScanCache', () => {
  it('stores and retrieves parsed trees by normalized path', async () => {
    const { tree } = await parseSource('.ts', 'export const x = 1;');
    const cache = new TreeSitterScanCache();

    cache.put({
      relativePath: 'src\\a.ts',
      text: 'export const x = 1;',
      tree,
      language: 'typescript',
      ext: '.ts',
    });

    expect(cache.has('src/a.ts')).toBe(true);
    expect(cache.get('src/a.ts')?.language).toBe('typescript');
  });
});
