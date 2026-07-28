import { describe, it, expect } from 'vitest';
import { enrichWorkspaceWithExternals, type SystemSchema } from '@archlens/core';
import {
  buildWorkspacePackageIndex,
  isRelativeImport,
  packageNameFromSpecifier,
  resolveWorkspacePackageContainer,
} from './workspacePackages.ts';
import { ModelExtractor } from './modelExtractor.ts';
import { componentMapKey } from './containerGrouping.ts';

describe('workspacePackages', () => {
  it('detects relative imports', () => {
    expect(isRelativeImport('./App')).toBe(true);
    expect(isRelativeImport('../core/foo')).toBe(true);
    expect(isRelativeImport('@archlens/core')).toBe(false);
    expect(isRelativeImport('path')).toBe(false);
  });

  it('extracts scoped and unscoped package names from module specifiers', () => {
    expect(packageNameFromSpecifier('@archlens/core')).toBe('@archlens/core');
    expect(packageNameFromSpecifier('@archlens/core/rules/graph')).toBe('@archlens/core');
    expect(packageNameFromSpecifier('lodash-es')).toBe('lodash-es');
    expect(packageNameFromSpecifier('lodash-es/debounce')).toBe('lodash-es');
    expect(packageNameFromSpecifier('./relative')).toBeNull();
    expect(packageNameFromSpecifier('../relative')).toBeNull();
  });

  it('builds a package-name → container-id index from source paths and package.json names', () => {
    const index = buildWorkspacePackageIndex(
      [
        'app/packages/core/src/index.ts',
        'app/packages/designer/src/App.tsx',
        'app/packages/cli/src/cli/blueprint.ts',
      ],
      {},
      packageDir => {
        const names: Record<string, string> = {
          'app/packages/core': '@archlens/core',
          'app/packages/designer': '@archlens/designer',
          'app/packages/cli': '@archlens/cli',
        };
        return names[packageDir] ?? null;
      }
    );

    expect(index.get('@archlens/core')).toBe('core');
    expect(index.get('@archlens/designer')).toBe('designer');
    expect(index.get('@archlens/cli')).toBe('cli');
    expect(resolveWorkspacePackageContainer('@archlens/core', index)).toBe('core');
    expect(resolveWorkspacePackageContainer('@archlens/core/rules/graph', index)).toBe('core');
    expect(resolveWorkspacePackageContainer('react', index)).toBeNull();
  });
});

describe('ModelExtractor workspace package imports', () => {
  const packageIndex = new Map([
    ['@archlens/core', 'core'],
    ['@archlens/cli', 'cli'],
  ]);

  it('creates inter-container edges for workspace package imports', () => {
    const extractor = new ModelExtractor('blueprint/app', { workspacePackageIndex: packageIndex });
    const { containerDependencies, componentDependencies } = extractor.extractGraph([
      {
        filePath: 'app/packages/designer/src/App.tsx',
        relativePath: 'app/packages/designer/src/App.tsx',
        baseName: 'App',
        isTestFile: false,
        imports: [{ moduleSpecifier: '@archlens/core' }],
        newExpressions: [],
        callExpressions: [],
      },
      {
        filePath: 'app/packages/core/src/index.ts',
        relativePath: 'app/packages/core/src/index.ts',
        baseName: 'index',
        isTestFile: false,
        imports: [],
        newExpressions: [],
        callExpressions: [],
      },
      {
        filePath: 'app/packages/core/src/rules/graph.ts',
        relativePath: 'app/packages/core/src/rules/graph.ts',
        baseName: 'graph',
        isTestFile: false,
        imports: [],
        newExpressions: [],
        callExpressions: [],
      },
    ]);

    expect(
      containerDependencies.some(
        d =>
          d.from === 'blueprint/app/designer' &&
          d.to === 'blueprint/app/core' &&
          d.type === 'inter-container'
      )
    ).toBe(true);

    expect(
      componentDependencies.some(
        d =>
          d.from === 'blueprint/app/designer/app' &&
          d.to === 'blueprint/app/core/index' &&
          d.type === 'direct-call'
      )
    ).toBe(true);
  });

  it('resolves workspace package subpath imports to target components', () => {
    const extractor = new ModelExtractor('blueprint/app', { workspacePackageIndex: packageIndex });
    const { componentDependencies } = extractor.extractGraph([
      {
        filePath: 'app/packages/designer/src/App.tsx',
        relativePath: 'app/packages/designer/src/App.tsx',
        baseName: 'App',
        isTestFile: false,
        imports: [{ moduleSpecifier: '@archlens/core/rules/graph' }],
        newExpressions: [],
        callExpressions: [],
      },
      {
        filePath: 'app/packages/core/src/rules/graph.ts',
        relativePath: 'app/packages/core/src/rules/graph.ts',
        baseName: 'graph',
        isTestFile: false,
        imports: [],
        newExpressions: [],
        callExpressions: [],
      },
    ]);

    expect(
      componentDependencies.some(
        d => d.from === 'blueprint/app/designer/app' && d.to === 'blueprint/app/core/graph'
      )
    ).toBe(true);
  });

  it('does not treat Node built-ins as local cross-container imports', () => {
    const extractor = new ModelExtractor('blueprint/app', { workspacePackageIndex: packageIndex });
    const { containerDependencies } = extractor.extractGraph([
      {
        filePath: 'app/packages/cli/scripts/copyTreeSitterWasms.ts',
        relativePath: 'app/packages/cli/scripts/copyTreeSitterWasms.ts',
        baseName: 'copyTreeSitterWasms',
        isTestFile: false,
        imports: [{ moduleSpecifier: 'path' }, { moduleSpecifier: 'fs' }],
        newExpressions: [],
        callExpressions: [],
      },
      {
        filePath: 'app/packages/core/src/rules/path.ts',
        relativePath: 'app/packages/core/src/rules/path.ts',
        baseName: 'path',
        isTestFile: false,
        imports: [],
        newExpressions: [],
        callExpressions: [],
      },
    ]);

    expect(
      containerDependencies.some(
        d => d.from === 'blueprint/app/cli' && d.to === 'blueprint/app/core'
      )
    ).toBe(false);
  });

  it('still resolves relative imports within and across containers', () => {
    const extractor = new ModelExtractor('blueprint/app');
    const { componentDependencies } = extractor.extractGraph([
      {
        filePath: 'app/packages/designer/src/db/db.ts',
        relativePath: 'app/packages/designer/src/db/db.ts',
        baseName: 'db',
        isTestFile: false,
        imports: [{ moduleSpecifier: './App' }],
        newExpressions: [],
        callExpressions: [],
      },
      {
        filePath: 'app/packages/designer/src/App.tsx',
        relativePath: 'app/packages/designer/src/App.tsx',
        baseName: 'App',
        isTestFile: false,
        imports: [],
        newExpressions: [],
        callExpressions: [],
      },
    ]);

    expect(
      componentDependencies.some(
        d => d.from.includes('/designer/db') && d.to.includes('/designer/app')
      )
    ).toBe(true);
    expect(componentMapKey('designer', 'app')).toBe('designer/app');
  });
});

describe('workspace package imports and externals pass', () => {
  it('materializes cross-container package targets as externals on component diagrams', () => {
    const designerComponents: SystemSchema = {
      entityRef: 'blueprint/app/designer',
      name: 'Designer Components',
      version: '1.0.0',
      level: 'component',
      nodes: [
        {
          entityRef: 'blueprint/app/designer/app',
          type: 'gateway-api',
          name: 'App Service',
        },
      ],
      dependencies: [
        {
          from: 'blueprint/app/designer/app',
          to: 'blueprint/app/core/index',
          type: 'direct-call',
        },
      ],
    };

    const coreComponents: SystemSchema = {
      entityRef: 'blueprint/app/core',
      name: 'Core Components',
      version: '1.0.0',
      level: 'component',
      nodes: [
        {
          entityRef: 'blueprint/app/core/index',
          type: 'background-worker',
          name: 'index Service',
        },
      ],
      dependencies: [],
    };

    const containers: SystemSchema = {
      entityRef: 'blueprint/app',
      name: 'App Containers',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'blueprint/app/designer', type: 'container', name: 'Designer Service' },
        { entityRef: 'blueprint/app/core', type: 'container', name: 'Core Service' },
      ],
      dependencies: [
        {
          from: 'blueprint/app/designer',
          to: 'blueprint/app/core',
          type: 'inter-container',
        },
      ],
    };

    const loaded = [
      { path: 'containers.yaml', name: 'Containers', schema: containers },
      { path: 'designer-components.yaml', name: 'Designer', schema: designerComponents },
      { path: 'core-components.yaml', name: 'Core', schema: coreComponents },
    ];

    const enriched = enrichWorkspaceWithExternals(loaded, {
      mode: 'unresolved',
      enrichLevels: ['component'],
    });

    const designer = enriched.find(s => s.path === 'designer-components.yaml')!.schema;
    expect(
      designer.nodes.find(n => n.entityRef === 'blueprint/app/core/index' && n.external)
    ).toMatchObject({
      name: expect.stringContaining('External'),
    });
  });
});
