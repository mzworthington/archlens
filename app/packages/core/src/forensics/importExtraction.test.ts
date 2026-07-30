import { describe, expect, it } from 'vitest';
import { extractRelativeImports } from './importExtraction';

describe('extractRelativeImports', () => {
  it('extracts TypeScript relative imports', () => {
    const text = `
import { a } from './foo';
import type { B } from '../bar';
const x = require('./legacy');
export { c } from './re-export';
`;
    expect(extractRelativeImports('src/a.ts', text).sort()).toEqual([
      '../bar',
      './foo',
      './legacy',
      './re-export',
    ]);
  });

  it('extracts Python relative imports', () => {
    const text = `
from .util import helper
from ..pkg import thing
`;
    expect(extractRelativeImports('pkg/main.py', text).sort()).toEqual(['..pkg', '.util']);
  });

  it('extracts Go relative imports', () => {
    const text = `import "./handler"`;
    expect(extractRelativeImports('internal/app.go', text)).toEqual(['./handler']);
  });

  it('extracts Java relative imports', () => {
    const text = `import .local.Helper;`;
    expect(extractRelativeImports('src/Main.java', text)).toEqual(['.local.Helper']);
  });
});
