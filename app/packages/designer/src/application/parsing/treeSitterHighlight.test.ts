import { describe, it, expect } from 'vitest';
import { highlightClassForCapture } from './highlightTheme';
import { compressToSpans, paintCharacterClasses } from './treeSitterHighlight';

describe('treeSitterHighlight', () => {
  it('maps tree-sitter capture names via theme config', () => {
    expect(highlightClassForCapture('keyword')).toContain('violet');
    expect(highlightClassForCapture('function.method')).toContain('blue');
    expect(highlightClassForCapture('unknown.capture')).toBeNull();
  });

  it('prefers shorter highlight spans when ranges overlap', () => {
    const classes = paintCharacterClasses(10, [
      { start: 0, end: 10, className: 'text-slate-500 italic' },
      { start: 2, end: 5, className: 'text-violet-400' },
    ]);
    expect(classes.slice(2, 5)).toEqual(['text-violet-400', 'text-violet-400', 'text-violet-400']);
  });

  it('compresses painted classes into render spans', () => {
    const source = 'ab12';
    const classes = paintCharacterClasses(source.length, [
      { start: 0, end: 2, className: 'text-violet-400' },
      { start: 2, end: 4, className: 'text-amber-300' },
    ]);
    expect(compressToSpans(source, classes)).toEqual([
      { text: 'ab', className: 'text-violet-400' },
      { text: '12', className: 'text-amber-300' },
    ]);
  });
});
