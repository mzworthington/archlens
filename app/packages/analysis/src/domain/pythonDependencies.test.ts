import { describe, it, expect } from 'vitest';
import {
  buildPythonModuleIndex,
  isPythonSourcePath,
  modulePathFromPythonFile,
  resolvePythonContainerFromPath,
  resolvePythonImport,
} from './pythonDependencies';
import { ModelExtractor } from './modelExtractor';
import type { ParsedSourceFile } from './types';
import { EntityRef } from '@archlens/core';

const parentRef = 'application/acme';

describe('pythonDependencies', () => {
  describe('isPythonSourcePath', () => {
    it('detects .py files', () => {
      expect(isPythonSourcePath('src/orders/service.py')).toBe(true);
      expect(isPythonSourcePath('src/orders/service.ts')).toBe(false);
    });
  });

  describe('resolvePythonContainerFromPath', () => {
    it('skips the src-layout distribution package so layers become containers', () => {
      expect(
        resolvePythonContainerFromPath('src/romini/features/library/add_track.py', {}, 'romini')
      ).toEqual({
        containerId: 'features',
        displayName: 'features',
      });
      expect(
        resolvePythonContainerFromPath('src/romini/composition/dashboard/library.py', {}, 'romini')
      ).toEqual({
        containerId: 'composition',
        displayName: 'composition',
      });
      expect(resolvePythonContainerFromPath('src/gateway/handlers.py')).toEqual({
        containerId: 'gateway',
        displayName: 'gateway',
      });
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

    it('strips a distribution package prefix when the scan root is inside that package', () => {
      const innerFiles: ParsedSourceFile[] = [
        {
          filePath: 'composition/dashboard/library.py',
          relativePath: 'composition/dashboard/library.py',
          baseName: 'library',
          isTestFile: false,
          imports: [],
          newExpressions: [],
          callExpressions: [],
          namespaces: [],
        },
        {
          filePath: 'features/library/add_track.py',
          relativePath: 'features/library/add_track.py',
          baseName: 'add_track',
          isTestFile: false,
          imports: [],
          newExpressions: [],
          callExpressions: [],
          namespaces: [],
        },
      ];
      const innerIndex = buildPythonModuleIndex(innerFiles, {});

      expect(
        resolvePythonImport(
          'composition/dashboard/library.py',
          'romini.features.library.add_track',
          innerIndex
        )
      ).toEqual({
        containerId: 'library',
        componentId: 'add_track',
      });
    });

    it('does not treat a third-party import as a local module that shares the last segment', () => {
      const files: ParsedSourceFile[] = [
        {
          filePath: 'responses.py',
          relativePath: 'responses.py',
          baseName: 'responses',
          isTestFile: false,
          imports: [],
          newExpressions: [],
          callExpressions: [],
          namespaces: [],
        },
      ];
      const localIndex = buildPythonModuleIndex(files, {});

      expect(resolvePythonImport('responses.py', 'fastapi.responses', localIndex)).toBeUndefined();
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

    it('links containers when src-layout imports keep a package prefix the scan root omitted', () => {
      const extractor = new ModelExtractor(parentRef);
      const { containerDependencies } = extractor.extractGraph([
        {
          filePath: 'composition/dashboard/library.py',
          relativePath: 'composition/dashboard/library.py',
          baseName: 'library',
          isTestFile: false,
          imports: [
            { moduleSpecifier: 'romini.features.library.add_track' },
            { moduleSpecifier: 'romini.features.play_by_tag.place_figure' },
          ],
          newExpressions: [],
          callExpressions: [],
          namespaces: [],
        },
        {
          filePath: 'features/library/add_track.py',
          relativePath: 'features/library/add_track.py',
          baseName: 'add_track',
          isTestFile: false,
          imports: [],
          newExpressions: [],
          callExpressions: [],
          namespaces: [],
        },
        {
          filePath: 'features/play_by_tag/place_figure.py',
          relativePath: 'features/play_by_tag/place_figure.py',
          baseName: 'place_figure',
          isTestFile: false,
          imports: [],
          newExpressions: [],
          callExpressions: [],
          namespaces: [],
        },
      ]);

      expect(containerDependencies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            from: EntityRef.child(parentRef, 'dashboard'),
            to: EntityRef.child(parentRef, 'library'),
          }),
          expect.objectContaining({
            from: EntityRef.child(parentRef, 'dashboard'),
            to: EntityRef.child(parentRef, 'play_by_tag'),
          }),
        ])
      );
    });
  });
});
