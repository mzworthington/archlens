import type Parser from 'web-tree-sitter';

export interface AstExtractionCollectors {
  imports: { moduleSpecifier: string }[];
  reExports: { moduleSpecifier: string }[];
  newExpressions: { className: string }[];
  callExpressions: string[];
  namespaces: string[];
}

export type LanguageAstVisitor = (
  node: Parser.SyntaxNode,
  collectors: AstExtractionCollectors
) => void;

function stripStringQuotes(raw: string): string {
  return raw.replace(/['"`]/g, '');
}

function isCapitalizedIdentifier(text: string): boolean {
  const firstChar = text.charAt(0);
  return firstChar >= 'A' && firstChar <= 'Z';
}

function visitTsJsNode(node: Parser.SyntaxNode, out: AstExtractionCollectors): void {
  switch (node.type) {
    case 'import_statement': {
      const literalNode = node.childForFieldName('source') || node.descendantsOfType('literal')[0];
      if (literalNode) {
        out.imports.push({ moduleSpecifier: stripStringQuotes(literalNode.text) });
      }
      return;
    }
    case 'export_statement': {
      const literalNode = node.childForFieldName('source') || node.descendantsOfType('string')[0];
      if (literalNode) {
        out.reExports.push({ moduleSpecifier: stripStringQuotes(literalNode.text) });
      }
      return;
    }
    case 'new_expression': {
      const constructorNode = node.childForFieldName('constructor');
      if (constructorNode) {
        out.newExpressions.push({ className: constructorNode.text });
      }
      return;
    }
    case 'call_expression': {
      const fnNode = node.childForFieldName('function');
      if (fnNode) {
        out.callExpressions.push(fnNode.text);
      }
      return;
    }
  }
}

function visitPythonNode(node: Parser.SyntaxNode, out: AstExtractionCollectors): void {
  switch (node.type) {
    case 'import_statement': {
      for (const dotted of node.descendantsOfType('dotted_name')) {
        out.imports.push({ moduleSpecifier: dotted.text });
      }
      return;
    }
    case 'import_from_statement': {
      const sourceNode =
        node.childForFieldName('module_name') || node.descendantsOfType('dotted_name')[0];
      if (sourceNode) {
        out.imports.push({ moduleSpecifier: sourceNode.text });
      }
      return;
    }
    case 'call': {
      const fnNode = node.childForFieldName('function');
      if (!fnNode) return;
      out.callExpressions.push(fnNode.text);
      if (isCapitalizedIdentifier(fnNode.text)) {
        out.newExpressions.push({ className: fnNode.text });
      }
      return;
    }
  }
}

function collectCSharpBaseTypes(node: Parser.SyntaxNode, out: AstExtractionCollectors): void {
  const baseList = node.children.find(child => child.type === 'base_list');
  if (!baseList) return;
  for (let i = 0; i < baseList.childCount; i++) {
    const baseNode = baseList.child(i)!;
    if (baseNode.type === 'identifier' || baseNode.type === 'generic_name') {
      out.newExpressions.push({ className: baseNode.text });
    }
  }
}

function visitCSharpNode(node: Parser.SyntaxNode, out: AstExtractionCollectors): void {
  switch (node.type) {
    case 'using_directive': {
      const nameNode =
        node.childForFieldName('name') ||
        node.descendantsOfType(['qualified_name', 'identifier'])[0];
      if (nameNode) {
        out.imports.push({ moduleSpecifier: nameNode.text });
      }
      return;
    }
    case 'object_creation_expression': {
      const typeNode = node.childForFieldName('type') || node.descendantsOfType('identifier')[0];
      if (typeNode) {
        out.newExpressions.push({ className: typeNode.text });
      }
      return;
    }
    case 'class_declaration': {
      collectCSharpBaseTypes(node, out);
      return;
    }
    case 'invocation_expression': {
      const fnNode = node.child(0);
      if (fnNode) {
        out.callExpressions.push(fnNode.text);
      }
      return;
    }
    case 'namespace_declaration':
    case 'file_scoped_namespace_declaration': {
      const nameNode =
        node.childForFieldName('name') ||
        node.descendantsOfType(['qualified_name', 'identifier'])[0];
      if (nameNode) {
        out.namespaces.push(nameNode.text);
      }
      return;
    }
  }
}

function visitJavaKotlinNode(node: Parser.SyntaxNode, out: AstExtractionCollectors): void {
  switch (node.type) {
    case 'import_declaration': {
      const nameNode = node.descendantsOfType(['scoped_identifier', 'identifier'])[0];
      if (nameNode) {
        out.imports.push({ moduleSpecifier: nameNode.text });
      }
      return;
    }
    case 'object_creation_expression': {
      const typeNode =
        node.childForFieldName('type') ?? node.descendantsOfType('type_identifier')[0];
      if (typeNode) {
        out.newExpressions.push({ className: typeNode.text });
      }
      return;
    }
    case 'method_invocation': {
      const nameNode = node.childForFieldName('name');
      const obj = node.childForFieldName('object');
      const fnText = obj ? `${obj.text}.${nameNode?.text ?? ''}` : (nameNode?.text ?? '');
      if (fnText) {
        out.callExpressions.push(fnText);
      }
      return;
    }
    case 'package_declaration': {
      const nameNode = node.descendantsOfType(['scoped_identifier', 'identifier'])[0];
      if (nameNode) {
        out.namespaces.push(nameNode.text);
      }
      return;
    }
  }
}

function visitGoNode(node: Parser.SyntaxNode, out: AstExtractionCollectors): void {
  switch (node.type) {
    case 'import_spec': {
      const pathNode =
        node.childForFieldName('path') ?? node.descendantsOfType('interpreted_string_literal')[0];
      if (pathNode) {
        out.imports.push({ moduleSpecifier: pathNode.text.replace(/"/g, '') });
      }
      return;
    }
    case 'call_expression': {
      const fnNode = node.childForFieldName('function');
      if (!fnNode) return;
      out.callExpressions.push(fnNode.text);
      const leaf = fnNode.text.split('.').pop();
      if (leaf && isCapitalizedIdentifier(leaf)) {
        out.newExpressions.push({ className: fnNode.text });
      }
      return;
    }
    case 'package_clause': {
      const nameNode =
        node.childForFieldName('name') ?? node.descendantsOfType('package_identifier')[0];
      if (nameNode) {
        out.namespaces.push(nameNode.text);
      }
      return;
    }
  }
}

const VISITORS_BY_EXTENSION: Readonly<Record<string, LanguageAstVisitor>> = {
  '.ts': visitTsJsNode,
  '.tsx': visitTsJsNode,
  '.js': visitTsJsNode,
  '.jsx': visitTsJsNode,
  '.py': visitPythonNode,
  '.cs': visitCSharpNode,
  '.java': visitJavaKotlinNode,
  '.kt': visitJavaKotlinNode,
  '.go': visitGoNode,
};

export function resolveLanguageVisitor(ext: string): LanguageAstVisitor | undefined {
  return VISITORS_BY_EXTENSION[ext];
}
