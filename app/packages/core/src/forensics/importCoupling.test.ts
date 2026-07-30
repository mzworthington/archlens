import { describe, expect, it } from 'vitest';
import { buildImportCoupling } from './importCoupling';

describe('buildImportCoupling', () => {
  it('maps direct imports to resolved targets within the scan set', () => {
    const allowed = new Set(['src/a.ts', 'src/b.ts', 'src/c.ts']);
    const imports = new Map([
      ['src/a.ts', ['./b', './c', 'external-pkg']],
      ['src/b.ts', ['../src/c']],
    ]);

    const coupling = buildImportCoupling(imports, allowed);

    expect(coupling.get('src/a.ts')).toEqual([
      { path: 'src/b.ts', kind: 'direct' },
      { path: 'src/c.ts', kind: 'direct' },
    ]);
    expect(coupling.get('src/b.ts')).toEqual([{ path: 'src/c.ts', kind: 'direct' }]);
  });

  it('deduplicates and skips self-imports', () => {
    const allowed = new Set(['src/a.ts']);
    const imports = new Map([['src/a.ts', ['./a', './a']]]);

    expect(buildImportCoupling(imports, allowed).get('src/a.ts')).toBeUndefined();
  });
});
