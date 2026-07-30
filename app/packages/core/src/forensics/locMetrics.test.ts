import { describe, expect, it } from 'vitest';
import { countLocAndSloc } from './locMetrics';

describe('countLocAndSloc', () => {
  it('counts physical and source lines', () => {
    const text = ['a', '', '// comment', 'b', '/*', 'block', '*/', 'c'].join('\n');
    const { loc, sloc } = countLocAndSloc(text);
    expect(loc).toBe(8);
    expect(sloc).toBe(3);
  });
});
