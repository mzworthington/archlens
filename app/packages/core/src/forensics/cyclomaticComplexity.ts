import type { TreeSitterWasmLanguage } from '../lib/treeSitterLanguages';

/** Languages with forensics cyclomatic rules (excludes IaC highlight-only grammars). */
export type CyclomaticLanguage = Exclude<TreeSitterWasmLanguage, 'terraform' | 'hcl'>;

export interface CyclomaticAstNode {
  type: string;
  /** Populated for `binary_expression` nodes when the operator is available. */
  operatorText?: string;
}

const TS_JS_DECISION_TYPES = new Set([
  'if_statement',
  'while_statement',
  'do_statement',
  'for_statement',
  'for_in_statement',
  'for_of_statement',
  'catch_clause',
  'switch_case',
  'ternary_expression',
]);

const PYTHON_DECISION_TYPES = new Set([
  'if_statement',
  'while_statement',
  'for_statement',
  'except_clause',
  'conditional_expression',
]);

const GO_DECISION_TYPES = new Set([
  'if_statement',
  'for_statement',
  'while_statement',
  'expression_case',
  'comm_case',
]);

const JAVA_DECISION_TYPES = new Set([
  'if_statement',
  'while_statement',
  'for_statement',
  'catch_clause',
  'ternary_expression',
  'switch_label',
]);

const CSHARP_DECISION_TYPES = new Set([
  'if_statement',
  'while_statement',
  'for_statement',
  'catch_clause',
  'conditional_expression',
  'case_switch_label',
]);

function isLogicalBinary(node: CyclomaticAstNode): boolean {
  return (
    node.type === 'binary_expression' && (node.operatorText === '&&' || node.operatorText === '||')
  );
}

function incrementForLanguage(language: CyclomaticLanguage, node: CyclomaticAstNode): number {
  switch (language) {
    case 'typescript':
    case 'tsx':
    case 'javascript':
      if (TS_JS_DECISION_TYPES.has(node.type)) return 1;
      if (isLogicalBinary(node)) return 1;
      return 0;
    case 'python':
      if (PYTHON_DECISION_TYPES.has(node.type)) return 1;
      if (node.type === 'and' || node.type === 'or') return 1;
      return 0;
    case 'go':
      if (GO_DECISION_TYPES.has(node.type)) return 1;
      if (isLogicalBinary(node)) return 1;
      return 0;
    case 'java':
      if (JAVA_DECISION_TYPES.has(node.type)) return 1;
      if (isLogicalBinary(node)) return 1;
      return 0;
    case 'c_sharp':
      if (CSHARP_DECISION_TYPES.has(node.type)) return 1;
      if (isLogicalBinary(node)) return 1;
      return 0;
    default:
      return 0;
  }
}

/**
 * McCabe cyclomatic complexity from a flat AST walk (base 1 + decision points).
 */
export function countCyclomaticComplexity(
  language: CyclomaticLanguage,
  nodes: readonly CyclomaticAstNode[]
): number {
  let complexity = 1;
  for (const node of nodes) {
    complexity += incrementForLanguage(language, node);
  }
  return complexity;
}
