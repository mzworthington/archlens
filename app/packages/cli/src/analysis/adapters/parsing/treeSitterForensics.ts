import Parser from 'web-tree-sitter';
import type { CyclomaticAstNode, CyclomaticLanguage } from '@archlens/core/forensics';

const FUNCTION_ROOT_TYPES: Record<CyclomaticLanguage, Set<string>> = {
  typescript: new Set([
    'function_declaration',
    'generator_function',
    'method_definition',
    'arrow_function',
  ]),
  tsx: new Set([
    'function_declaration',
    'generator_function',
    'method_definition',
    'arrow_function',
  ]),
  javascript: new Set([
    'function_declaration',
    'generator_function',
    'method_definition',
    'arrow_function',
  ]),
  python: new Set(['function_definition']),
  go: new Set(['function_declaration', 'method_declaration']),
  java: new Set(['method_declaration', 'constructor_declaration']),
  c_sharp: new Set([
    'method_declaration',
    'constructor_declaration',
    'local_function_statement',
    'destructor_declaration',
  ]),
};

export function collectCyclomaticAstNodes(root: Parser.SyntaxNode): CyclomaticAstNode[] {
  const nodes: CyclomaticAstNode[] = [];

  const walk = (node: Parser.SyntaxNode) => {
    let operatorText: string | undefined;
    if (node.type === 'binary_expression') {
      const operator = node.childForFieldName('operator');
      operatorText = operator?.text;
    }

    nodes.push({ type: node.type, operatorText });

    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i)!);
    }
  };

  walk(root);
  return nodes;
}

function collectFunctionBodyNodes(
  fnNode: Parser.SyntaxNode,
  language: CyclomaticLanguage
): CyclomaticAstNode[] {
  const roots = FUNCTION_ROOT_TYPES[language];
  const nodes: CyclomaticAstNode[] = [];

  const walk = (node: Parser.SyntaxNode) => {
    if (node !== fnNode && roots.has(node.type)) return;

    let operatorText: string | undefined;
    if (node.type === 'binary_expression') {
      const operator = node.childForFieldName('operator');
      operatorText = operator?.text;
    }
    nodes.push({ type: node.type, operatorText });

    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i)!);
    }
  };

  walk(fnNode);
  return nodes;
}

export function collectFunctionComplexitySlices(
  root: Parser.SyntaxNode,
  language: CyclomaticLanguage
): CyclomaticAstNode[][] {
  const roots = FUNCTION_ROOT_TYPES[language];
  const slices: CyclomaticAstNode[][] = [];

  const walk = (node: Parser.SyntaxNode) => {
    if (roots.has(node.type)) {
      slices.push(collectFunctionBodyNodes(node, language));
    }
    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i)!);
    }
  };

  walk(root);
  return slices;
}

function isRelativeSpecifier(spec: string): boolean {
  return spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('.');
}

export function extractRelativeImportsFromTree(ext: string, root: Parser.SyntaxNode): string[] {
  const imports = new Set<string>();

  const walk = (node: Parser.SyntaxNode) => {
    if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
      if (node.type === 'import_statement' || node.type === 'export_statement') {
        const literalNode =
          node.childForFieldName('source') ??
          node.descendantsOfType('string')[0] ??
          node.descendantsOfType('literal')[0];
        if (literalNode) {
          const spec = literalNode.text.replace(/['"`]/g, '');
          if (isRelativeSpecifier(spec)) imports.add(spec);
        }
      }
    }

    if (ext === '.py') {
      if (node.type === 'import_from_statement') {
        const sourceNode =
          node.childForFieldName('module_name') ?? node.descendantsOfType('dotted_name')[0];
        if (sourceNode && isRelativeSpecifier(sourceNode.text)) imports.add(sourceNode.text);
      }
      if (node.type === 'import_statement') {
        for (const n of node.descendantsOfType('dotted_name')) {
          if (isRelativeSpecifier(n.text)) imports.add(n.text);
        }
      }
    }

    if (ext === '.cs') {
      if (node.type === 'using_directive') {
        const nameNode =
          node.childForFieldName('name') ??
          node.descendantsOfType(['qualified_name', 'identifier'])[0];
        if (nameNode && isRelativeSpecifier(nameNode.text)) imports.add(nameNode.text);
      }
    }

    if (ext === '.java' || ext === '.kt') {
      if (node.type === 'import_declaration') {
        const nameNode = node.descendantsOfType(['scoped_identifier', 'identifier'])[0];
        if (nameNode && isRelativeSpecifier(nameNode.text)) imports.add(nameNode.text);
      }
    }

    if (ext === '.go') {
      if (node.type === 'import_spec') {
        const pathNode =
          node.childForFieldName('path') ?? node.descendantsOfType('interpreted_string_literal')[0];
        if (pathNode) {
          const spec = pathNode.text.replace(/"/g, '');
          if (isRelativeSpecifier(spec)) imports.add(spec);
        }
      }
    }

    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i)!);
    }
  };

  walk(root);
  return [...imports];
}

export interface CachedTreeParse {
  relativePath: string;
  text: string;
  tree: Parser.Tree;
  language: CyclomaticLanguage;
  ext: string;
}

export class TreeSitterScanCache {
  private readonly entries = new Map<string, CachedTreeParse>();

  put(entry: CachedTreeParse): void {
    this.entries.set(entry.relativePath.replace(/\\/g, '/'), entry);
  }

  get(relativePath: string): CachedTreeParse | undefined {
    return this.entries.get(relativePath.replace(/\\/g, '/'));
  }

  has(relativePath: string): boolean {
    return this.entries.has(relativePath.replace(/\\/g, '/'));
  }
}
