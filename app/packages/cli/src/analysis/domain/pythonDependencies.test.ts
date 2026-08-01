import { describe, it, expect } from 'vitest';
import {
  buildPythonModuleIndex,
  isPythonSourcePath,
  modulePathFromPythonFile,
  resolvePythonImport,
} from './pythonDependencies.ts';
import { ModelExtractor } from './modelExtractor.ts';
import type { ParsedSourceFile } from './types.ts';
import { EntityRef } from '@archlens/core';

const parentRef = 'application/acme';

describe('pythonDependencies', () => {
  describe('isPythonSourcePath', () => {
    it('detects .py files', () => {
      expect(isPythonSourcePath('src/orders/service.py')).toBe(true);
      expect(isPythonSourcePath('src/orders/service.ts')).toBe(false);
    });
  });

  describe('modulePathFromPythonFile', () => {
    it('maps src-layout modules', () => {
      expect(modulePathFromPythonFile('src/acme/orders/service.py')).toBe('acme.orders.service');
      expect(modulePathFromPythonFile('src/acme/orders/__init__.py')).toBe('acme.orders');
    });

    it('maps flat package modules', () => {
      expect(modulePathFromPythonFile('acme/orders.py')).toBe('acme.orders');
    });
  });

  describe('buildPythonModuleIndex', () => {
    it('indexes modules to container and component ids', () => {
      const files: ParsedSourceFile[] = [
        {
          filePath: 'src/acme/orders/service.py',
          relativePath: 'src/acme/orders/service.py',
          baseName: 'service',
          isTestFile: false,
          imports: [],
          newExpressions: [],
          callExpressions: [],
          namespaces: [],
        },
      ];

      const index = buildPythonModuleIndex(files, {});
      expect(index.get('acme.orders.service')).toEqual({
        containerId: 'acme',
        componentId: 'orders',
      });
    });
  });

  describe('resolvePythonImport', () => {
    const files: ParsedSourceFile[] = [
      {
        filePath: 'src/gateway/handlers.py',
        relativePath: 'src/gateway/handlers.py',
        baseName: 'handlers',
        isTestFile: false,
        imports: [],
        newExpressions: [],
        callExpressions: [],
        namespaces: [],
      },
      {
        filePath: 'src/orders/service.py',
        relativePath: 'src/orders/service.py',
        baseName: 'service',
        isTestFile: false,
        imports: [],
        newExpressions: [],
        callExpressions: [],
        namespaces: [],
      },
      {
        filePath: 'src/catalog/client.py',
        relativePath: 'src/catalog/client.py',
        baseName: 'client',
        isTestFile: false,
        imports: [],
        newExpressions: [],
        callExpressions: [],
        namespaces: [],
      },
    ];
    const index = buildPythonModuleIndex(files, {});

    it('resolves absolute imports', () => {
      expect(resolvePythonImport('src/gateway/handlers.py', 'orders.service', index)).toEqual({
        containerId: 'orders',
        componentId: 'orders',
      });
    });

    it('resolves parent-relative imports', () => {
      expect(resolvePythonImport('src/gateway/handlers.py', '..catalog.client', index)).toEqual({
        containerId: 'catalog',
        componentId: 'catalog',
      });
    });

    it('ignores stdlib imports', () => {
      expect(resolvePythonImport('src/gateway/handlers.py', 'os', index)).toBeUndefined();
    });
  });

  describe('ModelExtractor integration', () => {
    it('links Python modules via absolute and relative imports', () => {
      const extractor = new ModelExtractor(parentRef);
      const { componentDependencies, containerDependencies } = extractor.extractGraph([
        {
          filePath: 'src/gateway/handlers.py',
          relativePath: 'src/gateway/handlers.py',
          baseName: 'handlers',
          isTestFile: false,
          imports: [{ moduleSpecifier: 'orders.service' }, { moduleSpecifier: '..catalog.client' }],
          newExpressions: [],
          callExpressions: [],
          namespaces: [],
        },
        {
          filePath: 'src/orders/service.py',
          relativePath: 'src/orders/service.py',
          baseName: 'service',
          isTestFile: false,
          imports: [],
          newExpressions: [],
          callExpressions: [],
          namespaces: [],
        },
        {
          filePath: 'src/catalog/client.py',
          relativePath: 'src/catalog/client.py',
          baseName: 'client',
          isTestFile: false,
          imports: [],
          newExpressions: [],
          callExpressions: [],
          namespaces: [],
        },
      ]);

      expect(componentDependencies).toHaveLength(2);
      expect(componentDependencies).toContainEqual(
        expect.objectContaining({
          from: EntityRef.child(EntityRef.child(parentRef, 'gateway'), 'gateway'),
          to: EntityRef.child(EntityRef.child(parentRef, 'orders'), 'orders'),
        })
      );
      expect(componentDependencies).toContainEqual(
        expect.objectContaining({
          from: EntityRef.child(EntityRef.child(parentRef, 'gateway'), 'gateway'),
          to: EntityRef.child(EntityRef.child(parentRef, 'catalog'), 'catalog'),
        })
      );
      expect(containerDependencies).toHaveLength(2);
    });
  });
});
