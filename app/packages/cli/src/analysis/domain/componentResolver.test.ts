import { describe, it, expect } from 'vitest';
import { resolveComponentIdentity } from './componentResolver.ts';
import type { ParsedSourceFile } from './types.ts';

function file(relativePath: string, overrides: Partial<ParsedSourceFile> = {}): ParsedSourceFile {
  const baseName =
    overrides.baseName ??
    relativePath
      .split('/')
      .pop()!
      .replace(/\.[^.]+$/, '');
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

describe('componentResolver', () => {
  it('dispatches to language-specific rollup resolvers', () => {
    expect(resolveComponentIdentity(file('src/domain/graph.ts'))).toEqual({
      componentId: 'graph',
      componentName: 'Graph',
    });

    expect(
      resolveComponentIdentity(
        file('src/main/java/com/acme/orders/OrderService.java', {
          namespaces: ['com.acme.orders'],
        })
      )
    ).toEqual({
      componentId: 'orders',
      componentName: 'Orders',
    });

    expect(resolveComponentIdentity(file('internal/resilience/engine.go'))).toEqual({
      componentId: 'resilience',
      componentName: 'Resilience',
    });

    expect(resolveComponentIdentity(file('src/orders/service.py'))).toEqual({
      componentId: 'orders',
      componentName: 'Orders',
    });
  });

  it('returns null for unsupported extensions', () => {
    expect(resolveComponentIdentity(file('README.md', { baseName: 'README' }))).toBeNull();
  });
});
