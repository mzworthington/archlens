import Parser from 'web-tree-sitter';
import type { TreeSitterWasmLanguage } from '@archlens/core';
import { highlightQueryForLanguage } from './highlightQuerySources';
import { highlightClassForCapture } from './highlightTheme';
import { loadTreeSitterLanguageForFile } from './treeSitterClient';

export type HighlightSpan = {
  text: string;
  className: string | null;
};

type IndexedCapture = {
  start: number;
  end: number;
  className: string;
};

export function indexedCapturesFromQuery(
  root: Parser.SyntaxNode,
  query: Parser.Query
): IndexedCapture[] {
  const captures: IndexedCapture[] = [];
  for (const capture of query.captures(root)) {
    const className = highlightClassForCapture(capture.name);
    if (!className) continue;
    captures.push({
      start: capture.node.startIndex,
      end: capture.node.endIndex,
      className,
    });
  }
  return captures;
}

/** Shorter highlight spans win over outer spans (tree-sitter-highlight convention). */
export function paintCharacterClasses(
  sourceLength: number,
  captures: IndexedCapture[]
): (string | null)[] {
  const classes: (string | null)[] = Array.from({ length: sourceLength }, () => null);
  const sorted = [...captures].sort((a, b) => b.end - b.start - (a.end - a.start));

  for (const capture of sorted) {
    const start = Math.max(0, capture.start);
    const end = Math.min(sourceLength, capture.end);
    for (let index = start; index < end; index++) {
      classes[index] = capture.className;
    }
  }

  return classes;
}

export function compressToSpans(source: string, classes: (string | null)[]): HighlightSpan[] {
  if (source.length === 0) return [];

  const spans: HighlightSpan[] = [];
  let index = 0;

  while (index < source.length) {
    const className = classes[index] ?? null;
    let end = index + 1;
    while (end < source.length && (classes[end] ?? null) === className) {
      end++;
    }
    spans.push({ text: source.slice(index, end), className });
    index = end;
  }

  return spans;
}

export function highlightSource(
  source: string,
  language: Parser.Language,
  langKey: TreeSitterWasmLanguage
): HighlightSpan[] {
  const parser = new Parser();
  parser.setLanguage(language);
  const tree = parser.parse(source);
  const root = tree.rootNode;

  const query = language.query(highlightQueryForLanguage(langKey));
  const captures = indexedCapturesFromQuery(root, query);
  query.delete();
  tree.delete();
  parser.delete();

  return compressToSpans(source, paintCharacterClasses(source.length, captures));
}

export async function highlightSourceFile(
  source: string,
  filepath: string
): Promise<HighlightSpan[] | null> {
  const loaded = await loadTreeSitterLanguageForFile(filepath);
  if (!loaded) return null;
  try {
    return highlightSource(source, loaded.language, loaded.lang);
  } catch {
    return null;
  }
}
