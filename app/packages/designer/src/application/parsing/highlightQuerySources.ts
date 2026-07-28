/**
 * Vendored tree-sitter highlight queries (queries/highlights.scm from upstream grammar repos).
 * Sync from npm when upgrading grammars; avoids native build scripts in CI.
 */
import type { TreeSitterWasmLanguage } from '@archlens/core';
import csharpHighlights from './queries/c-sharp.scm?raw';
import goHighlights from './queries/go.scm?raw';
import javaHighlights from './queries/java.scm?raw';
import javascriptHighlights from './queries/javascript.scm?raw';
import pythonHighlights from './queries/python.scm?raw';
import typescriptHighlights from './queries/typescript.scm?raw';

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
