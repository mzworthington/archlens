import type Parser from 'web-tree-sitter';
import { isTestSourcePath } from '../domain/testPath';
import type { ParsedSourceFile } from '../domain/types';
import { resolveLanguageVisitor, type AstExtractionCollectors } from './languageNodeVisitors';

function extensionOf(path: string): string {
  const idx = path.lastIndexOf('.');
  return idx >= 0 ? path.slice(idx).toLowerCase() : '';
}

function baseNameOf(relativePath: string): string {
  const file = relativePath.split('/').pop() ?? relativePath;
  const idx = file.lastIndexOf('.');
  return idx >= 0 ? file.slice(0, idx) : file;
}

export type ExtractParsedSourceFileInput = {
  filePath: string;
  relativePath: string;
  tree: Parser.Tree;
};

/** Convert a tree-sitter AST into the language-neutral ParsedSourceFile contract. */
export function extractParsedSourceFileFromTree({
  filePath,
  relativePath,
  tree,
}: ExtractParsedSourceFileInput): ParsedSourceFile {
  const visitor = resolveLanguageVisitor(extensionOf(relativePath));
  const collectors: AstExtractionCollectors = {
    imports: [],
    reExports: [],
    newExpressions: [],
    callExpressions: [],
    namespaces: [],
  };

  if (visitor) {
    const walk = (node: Parser.SyntaxNode) => {
      visitor(node, collectors);
      for (let i = 0; i < node.childCount; i++) {
        walk(node.child(i)!);
      }
    };
    walk(tree.rootNode);
  }

  return {
    filePath,
    relativePath,
    baseName: baseNameOf(relativePath),
    isTestFile: isTestSourcePath(relativePath),
    ...collectors,
  };
}
