import type { TreeSitterWasmLanguage } from '@blueprint/core';
import csharpHighlights from 'tree-sitter-c-sharp/queries/highlights.scm?raw';
import goHighlights from 'tree-sitter-go/queries/highlights.scm?raw';
import javaHighlights from 'tree-sitter-java/queries/highlights.scm?raw';
import javascriptHighlights from 'tree-sitter-javascript/queries/highlights.scm?raw';
import pythonHighlights from 'tree-sitter-python/queries/highlights.scm?raw';
import typescriptHighlights from 'tree-sitter-typescript/queries/highlights.scm?raw';

const JS_FAMILY_HIGHLIGHTS = `${javascriptHighlights}\n${typescriptHighlights}`;

const HIGHLIGHT_QUERIES: Record<TreeSitterWasmLanguage, string> = {
  javascript: javascriptHighlights,
  typescript: JS_FAMILY_HIGHLIGHTS,
  tsx: JS_FAMILY_HIGHLIGHTS,
  python: pythonHighlights,
  go: goHighlights,
  java: javaHighlights,
  c_sharp: csharpHighlights,
};

export function highlightQueryForLanguage(lang: TreeSitterWasmLanguage): string {
  return HIGHLIGHT_QUERIES[lang];
}
