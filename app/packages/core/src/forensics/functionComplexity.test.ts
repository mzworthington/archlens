import { describe, expect, it } from 'vitest';
import { countCognitiveComplexity, summarizeFunctionComplexitySlices } from './functionComplexity';

describe('summarizeFunctionComplexitySlices', () => {
  it('uses file fallback when no function slices exist', () => {
    const nodes = [{ type: 'if_statement' }, { type: 'binary_expression', operatorText: '&&' }];
    const summary = summarizeFunctionComplexitySlices('typescript', [], nodes);
    expect(summary.functionCount).toBe(0);
    expect(summary.complexityPeak).toBe(3);
    expect(summary.cognitivePeak).toBeGreaterThan(0);
  });

  it('tracks peak across function slices', () => {
    const small = [{ type: 'if_statement' }];
    const large = [
      { type: 'if_statement' },
      { type: 'while_statement' },
      { type: 'ternary_expression' },
    ];
    const summary = summarizeFunctionComplexitySlices('typescript', [small, large], []);
    expect(summary.functionCount).toBe(2);
    expect(summary.complexityPeak).toBe(4);
  });
});

describe('countCognitiveComplexity', () => {
  it('adds nesting penalty for nested control flow', () => {
    const nested = [
      { type: 'if_statement' },
      { type: 'if_statement' },
      { type: 'while_statement' },
    ];
    const flat = [{ type: 'if_statement' }, { type: 'while_statement' }];
    expect(countCognitiveComplexity('typescript', nested)).toBeGreaterThan(
      countCognitiveComplexity('typescript', flat)
    );
  });
});
