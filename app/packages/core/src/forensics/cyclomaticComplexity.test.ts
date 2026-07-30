import { describe, expect, it } from 'vitest';
import { countCyclomaticComplexity } from './cyclomaticComplexity';

describe('countCyclomaticComplexity', () => {
  it('counts TypeScript decision points from a representative fixture', () => {
    const nodes = [
      { type: 'if_statement' },
      { type: 'binary_expression', operatorText: '&&' },
      { type: 'ternary_expression' },
      { type: 'for_in_statement' },
      { type: 'while_statement' },
      { type: 'catch_clause' },
      { type: 'switch_case' },
      { type: 'switch_case' },
    ];
    // base 1 + if + && + ternary + for + while + catch + case + case = 9
    expect(countCyclomaticComplexity('typescript', nodes)).toBe(9);
  });

  it('counts Python control flow and boolean operators', () => {
    const nodes = [
      { type: 'if_statement' },
      { type: 'and' },
      { type: 'conditional_expression' },
      { type: 'for_statement' },
      { type: 'while_statement' },
      { type: 'except_clause' },
    ];
    expect(countCyclomaticComplexity('python', nodes)).toBe(7);
  });

  it('counts Java switch labels and ternary expressions', () => {
    const nodes = [
      { type: 'if_statement' },
      { type: 'binary_expression', operatorText: '&&' },
      { type: 'ternary_expression' },
      { type: 'for_statement' },
      { type: 'while_statement' },
      { type: 'catch_clause' },
      { type: 'switch_label' },
      { type: 'switch_label' },
    ];
    expect(countCyclomaticComplexity('java', nodes)).toBe(9);
  });

  it('counts Go cases and logical operators', () => {
    const nodes = [
      { type: 'if_statement' },
      { type: 'binary_expression', operatorText: '&&' },
      { type: 'for_statement' },
      { type: 'expression_case' },
      { type: 'expression_case' },
    ];
    expect(countCyclomaticComplexity('go', nodes)).toBe(6);
  });

  it('counts C# conditional expressions and case labels', () => {
    const nodes = [
      { type: 'if_statement' },
      { type: 'binary_expression', operatorText: '&&' },
      { type: 'conditional_expression' },
      { type: 'for_statement' },
      { type: 'while_statement' },
      { type: 'catch_clause' },
      { type: 'case_switch_label' },
      { type: 'case_switch_label' },
    ];
    expect(countCyclomaticComplexity('c_sharp', nodes)).toBe(9);
  });

  it('returns base complexity for empty walks', () => {
    expect(countCyclomaticComplexity('javascript', [])).toBe(1);
  });
});
