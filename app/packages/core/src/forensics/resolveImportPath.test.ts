import { describe, expect, it } from 'vitest';
import { resolveRelativeImport } from './resolveImportPath';

const known = new Set(['src/foo.ts', 'src/bar/index.ts', 'pkg/util.py', 'internal/handler.go']);

describe('resolveRelativeImport', () => {
  it('resolves exact paths and extension/index candidates', () => {
    expect(resolveRelativeImport('src/a.ts', './foo', known)).toBe('src/foo.ts');
    expect(resolveRelativeImport('src/a.ts', './bar', known)).toBe('src/bar/index.ts');
    expect(resolveRelativeImport('pkg/main.py', './util', known)).toBe('pkg/util.py');
  });

  it('returns null for package or unresolved imports', () => {
    expect(resolveRelativeImport('src/a.ts', 'lodash', known)).toBeNull();
    expect(resolveRelativeImport('src/a.ts', './missing', known)).toBeNull();
  });

  it('normalizes parent directory segments', () => {
    expect(resolveRelativeImport('src/nested/a.ts', '../foo', known)).toBe('src/foo.ts');
  });

  it('resolves Python dot-style specifiers', () => {
    expect(resolveRelativeImport('pkg/main.py', '.util', known)).toBe('pkg/util.py');
    expect(resolveRelativeImport('pkg/sub/main.py', '..util', known)).toBe('pkg/util.py');
  });
});
