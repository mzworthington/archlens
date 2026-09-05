import { describe, it, expect } from 'vitest';
import type { ParsedSourceFile } from './types.ts';
import { ModelExtractor } from './modelExtractor.ts';

function tsFile(relativePath: string, overrides: Partial<ParsedSourceFile> = {}): ParsedSourceFile {
  const baseName = relativePath
    .split('/')
    .pop()!
    .replace(/\.(ts|tsx)$/, '');
  return {
    filePath: relativePath,
    relativePath,
    baseName,
    isTestFile: false,
    imports: [],
    reExports: [],
    newExpressions: [],
    callExpressions: [],
    ...overrides,
  };
}

describe('ModelExtractor re-exports', () => {
  it('links barrel files to relative modules via export-from declarations', () => {
    const extractor = new ModelExtractor('blueprint/app', {
      workspacePackageRoots: ['packages'],
    });

    const { componentDependencies } = extractor.extractGraph([
      tsFile('app/packages/core/src/import-iac.ts', {
        reExports: [{ moduleSpecifier: './rules/iacImport' }, { moduleSpecifier: './rules/path' }],
      }),
      tsFile('app/packages/core/src/rules/iacImport.ts', {
        imports: [{ moduleSpecifier: '@cruglobal/js-hcl2' }],
      }),
      tsFile('app/packages/core/src/rules/path.ts'),
    ]);

    const fromBarrel = 'blueprint/app/core/import-iac';
    const toRules = 'blueprint/app/core/rules';

    expect(componentDependencies.some(d => d.from === fromBarrel && d.to === toRules)).toBe(true);
  });
});
