import type Parser from 'web-tree-sitter';
import { isTestSourcePath } from '../domain/testPath.ts';
import type { ParsedSourceFile } from '../domain/types.ts';

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
  const ext = extensionOf(relativePath);
  const imports: { moduleSpecifier: string }[] = [];
  const reExports: { moduleSpecifier: string }[] = [];
  const newExpressions: { className: string }[] = [];
  const callExpressions: string[] = [];
  const namespaces: string[] = [];

  const walk = (node: Parser.SyntaxNode) => {
    if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
      if (node.type === 'import_statement') {
        const literalNode =
          node.childForFieldName('source') || node.descendantsOfType('literal')[0];
        if (literalNode) {
          imports.push({ moduleSpecifier: literalNode.text.replace(/['"`]/g, '') });
        }
      }
      if (node.type === 'export_statement') {
        const literalNode = node.childForFieldName('source') || node.descendantsOfType('string')[0];
        if (literalNode) {
          reExports.push({ moduleSpecifier: literalNode.text.replace(/['"`]/g, '') });
        }
      }
      if (node.type === 'new_expression') {
        const constructorNode = node.childForFieldName('constructor');
        if (constructorNode) {
          newExpressions.push({ className: constructorNode.text });
        }
      }
      if (node.type === 'call_expression') {
        const fnNode = node.childForFieldName('function');
        if (fnNode) {
          callExpressions.push(fnNode.text);
        }
      }
    }

    if (ext === '.py') {
      if (node.type === 'import_statement') {
        node.descendantsOfType('dotted_name').forEach(n => {
          imports.push({ moduleSpecifier: n.text });
        });
      }
      if (node.type === 'import_from_statement') {
        const sourceNode =
          node.childForFieldName('module_name') || node.descendantsOfType('dotted_name')[0];
        if (sourceNode) {
          imports.push({ moduleSpecifier: sourceNode.text });
        }
      }
      if (node.type === 'call') {
        const fnNode = node.childForFieldName('function');
        if (fnNode) {
          callExpressions.push(fnNode.text);
          const firstChar = fnNode.text.charAt(0);
          if (firstChar >= 'A' && firstChar <= 'Z') {
            newExpressions.push({ className: fnNode.text });
          }
        }
      }
    }

    if (ext === '.cs') {
      if (node.type === 'using_directive') {
        const nameNode =
          node.childForFieldName('name') ||
          node.descendantsOfType(['qualified_name', 'identifier'])[0];
        if (nameNode) {
          imports.push({ moduleSpecifier: nameNode.text });
        }
      }
      if (node.type === 'object_creation_expression') {
        const typeNode = node.childForFieldName('type') || node.descendantsOfType('identifier')[0];
        if (typeNode) {
          newExpressions.push({ className: typeNode.text });
        }
      }
      if (node.type === 'class_declaration') {
        const baseList = node.children.find(child => child.type === 'base_list');
        if (baseList) {
          for (let i = 0; i < baseList.childCount; i++) {
            const baseNode = baseList.child(i)!;
            if (baseNode.type === 'identifier' || baseNode.type === 'generic_name') {
              newExpressions.push({ className: baseNode.text });
            }
          }
        }
      }
      if (node.type === 'invocation_expression') {
        const fnNode = node.child(0);
        if (fnNode) {
          callExpressions.push(fnNode.text);
        }
      }
      if (
        node.type === 'namespace_declaration' ||
        node.type === 'file_scoped_namespace_declaration'
      ) {
        const nameNode =
          node.childForFieldName('name') ||
          node.descendantsOfType(['qualified_name', 'identifier'])[0];
        if (nameNode) {
          namespaces.push(nameNode.text);
        }
      }
    }

    if (ext === '.java' || ext === '.kt') {
      if (node.type === 'import_declaration') {
        const nameNode = node.descendantsOfType(['scoped_identifier', 'identifier'])[0];
        if (nameNode) {
          imports.push({ moduleSpecifier: nameNode.text });
        }
      }
      if (node.type === 'object_creation_expression') {
        const typeNode =
          node.childForFieldName('type') ?? node.descendantsOfType('type_identifier')[0];
        if (typeNode) {
          newExpressions.push({ className: typeNode.text });
        }
      }
      if (node.type === 'method_invocation') {
        const nameNode = node.childForFieldName('name');
        const obj = node.childForFieldName('object');
        const fnText = obj ? `${obj.text}.${nameNode?.text ?? ''}` : (nameNode?.text ?? '');
        if (fnText) callExpressions.push(fnText);
      }
      if (node.type === 'package_declaration') {
        const nameNode = node.descendantsOfType(['scoped_identifier', 'identifier'])[0];
        if (nameNode) {
          namespaces.push(nameNode.text);
        }
      }
    }

    if (ext === '.go') {
      if (node.type === 'import_spec') {
        const pathNode =
          node.childForFieldName('path') ?? node.descendantsOfType('interpreted_string_literal')[0];
        if (pathNode) {
          imports.push({ moduleSpecifier: pathNode.text.replace(/"/g, '') });
        }
      }
      if (node.type === 'call_expression') {
        const fnNode = node.childForFieldName('function');
        if (fnNode) {
          callExpressions.push(fnNode.text);
          const parts = fnNode.text.split('.');
          const leaf = parts[parts.length - 1];
          if (leaf && leaf[0] >= 'A' && leaf[0] <= 'Z') {
            newExpressions.push({ className: fnNode.text });
          }
        }
      }
      if (node.type === 'package_clause') {
        const nameNode =
          node.childForFieldName('name') ?? node.descendantsOfType('package_identifier')[0];
        if (nameNode) {
          namespaces.push(nameNode.text);
        }
      }
    }

    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i)!);
    }
  };

  walk(tree.rootNode);

  return {
    filePath,
    relativePath,
    baseName: baseNameOf(relativePath),
    isTestFile: isTestSourcePath(relativePath),
    imports,
    reExports,
    newExpressions,
    callExpressions,
    namespaces,
  };
}
