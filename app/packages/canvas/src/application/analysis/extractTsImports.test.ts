import { describe, it, expect } from 'vitest';
import { extractTsImports, resolveRelativeSpecifier } from './extractTsImports';

describe('extractTsImports', () => {
  it('extracts import and export-from specifiers', () => {
    const source = `
import React from 'react';
import type { Foo } from './foo';
import './side-effect';
export { Bar } from '../bar';
const x = require('./legacy');
`;
    const result = extractTsImports(source);
    expect(result.imports).toEqual(['react', './foo', './side-effect', './legacy']);
    expect(result.reExports).toEqual(['../bar']);
  });
});

describe('resolveRelativeSpecifier', () => {
  it('resolves relative imports against known paths', () => {
    const known = new Set(['src/a.ts', 'src/b.ts', 'src/util/index.ts']);
    expect(resolveRelativeSpecifier('src/a.ts', './b', known)).toBe('src/b.ts');
    expect(resolveRelativeSpecifier('src/a.ts', './util', known)).toBe('src/util/index.ts');
    expect(resolveRelativeSpecifier('src/a.ts', 'lodash', known)).toBeNull();
  });
});
