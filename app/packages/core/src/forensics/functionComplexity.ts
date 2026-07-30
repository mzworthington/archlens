import type { CyclomaticAstNode, CyclomaticLanguage } from './cyclomaticComplexity';
import { countCyclomaticComplexity } from './cyclomaticComplexity';

const COGNITIVE_INCREMENT_TYPES: Record<CyclomaticLanguage, readonly string[]> = {
  typescript: [
    'if_statement',
    'for_statement',
    'for_in_statement',
    'for_of_statement',
    'while_statement',
    'do_statement',
    'catch_clause',
    'switch_case',
    'ternary_expression',
  ],
  tsx: [
    'if_statement',
    'for_statement',
    'for_in_statement',
    'for_of_statement',
    'while_statement',
    'do_statement',
    'catch_clause',
    'switch_case',
    'ternary_expression',
  ],
  javascript: [
    'if_statement',
    'for_statement',
    'for_in_statement',
    'for_of_statement',
    'while_statement',
    'do_statement',
    'catch_clause',
    'switch_case',
    'ternary_expression',
  ],
  python: [
    'if_statement',
    'for_statement',
    'while_statement',
    'except_clause',
    'conditional_expression',
  ],
  go: ['if_statement', 'for_statement', 'while_statement', 'expression_case'],
  java: [
    'if_statement',
    'for_statement',
    'while_statement',
    'catch_clause',
    'switch_label',
    'ternary_expression',
  ],
  c_sharp: [
    'if_statement',
    'for_statement',
    'while_statement',
    'catch_clause',
    'case_switch_label',
    'conditional_expression',
  ],
};

function cognitiveIncrement(
  language: CyclomaticLanguage,
  node: CyclomaticAstNode,
  nesting: number
): number {
  const types = COGNITIVE_INCREMENT_TYPES[language];
  if (types.includes(node.type)) return 1 + nesting;
  if (
    node.type === 'binary_expression' &&
    (node.operatorText === '&&' || node.operatorText === '||')
  ) {
    return 1 + nesting;
  }
  if (language === 'python' && (node.type === 'and' || node.type === 'or')) {
    return 1 + nesting;
  }
  return 0;
}

/**
 * Sonar-style cognitive complexity for a function slice (flat AST walk).
 */
export function countCognitiveComplexity(
  language: CyclomaticLanguage,
  nodes: readonly CyclomaticAstNode[]
): number {
  let score = 0;
  let nesting = 0;

  for (const node of nodes) {
    if (COGNITIVE_INCREMENT_TYPES[language].includes(node.type)) {
      score += cognitiveIncrement(language, node, nesting);
      nesting++;
    } else {
      score += cognitiveIncrement(language, node, nesting);
    }
  }

  return score;
}

export interface FunctionComplexitySummary {
  complexityPeak: number;
  cognitivePeak: number;
  functionCount: number;
}

export function summarizeFunctionComplexitySlices(
  language: CyclomaticLanguage,
  slices: readonly (readonly CyclomaticAstNode[])[],
  fileFallback: readonly CyclomaticAstNode[]
): FunctionComplexitySummary {
  if (slices.length === 0) {
    return {
      complexityPeak: countCyclomaticComplexity(language, fileFallback),
      cognitivePeak: countCognitiveComplexity(language, fileFallback),
      functionCount: 0,
    };
  }

  let complexityPeak = 0;
  let cognitivePeak = 0;
  for (const slice of slices) {
    const cyclomatic = countCyclomaticComplexity(language, slice);
    const cognitive = countCognitiveComplexity(language, slice);
    if (cyclomatic > complexityPeak) complexityPeak = cyclomatic;
    if (cognitive > cognitivePeak) cognitivePeak = cognitive;
  }

  return { complexityPeak, cognitivePeak, functionCount: slices.length };
}
