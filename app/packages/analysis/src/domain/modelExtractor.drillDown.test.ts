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

describe('ModelExtractor rollup drill-down', () => {
  it('tracks member filepaths and file-level nodes for folder rollups', () => {
    const extractor = new ModelExtractor('blueprint/app', {
      workspacePackageRoots: ['packages'],
    });

    const { componentNodesMap, fileLevelNodesMap, fileLevelDependencies } = extractor.extractGraph([
      tsFile('app/packages/cli/src/writers/baseWriter.ts'),
      tsFile('app/packages/cli/src/writers/contextLevelWriter.ts', {
        imports: [{ moduleSpecifier: './baseWriter' }],
      }),
    ]);

    const writers = [...componentNodesMap.values()].find(
      node => node.entityRef === 'blueprint/app/cli/writers'
    );
    expect(writers?.properties?.memberFilepaths).toEqual([
      'app/packages/cli/src/writers/baseWriter.ts',
      'app/packages/cli/src/writers/contextLevelWriter.ts',
    ]);

    expect([...fileLevelNodesMap.keys()].sort()).toEqual([
      'blueprint/app/cli/writers/base-writer',
      'blueprint/app/cli/writers/context-level-writer',
    ]);

    expect(fileLevelDependencies).toEqual([
      {
        from: 'blueprint/app/cli/writers/context-level-writer',
        to: 'blueprint/app/cli/writers/base-writer',
        type: 'direct-call',
        description: 'Calls module / service',
      },
    ]);
  });
});
