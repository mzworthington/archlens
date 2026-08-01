import { describe, it, expect } from 'vitest';
import {
  isTypeScriptSourcePath,
  resolveRelativeTypeScriptImportPath,
  resolveTypeScriptComponent,
  resolveTypeScriptImportComponentId,
  shouldSkipTypeScriptFile,
} from './typescriptGrouping.ts';

describe('typescriptGrouping', () => {
  describe('shouldSkipTypeScriptFile', () => {
    it('skips config, declaration, and setup boilerplate', () => {
      expect(shouldSkipTypeScriptFile('app/vitest.config.ts', 'vitest.config')).toBe(true);
      expect(shouldSkipTypeScriptFile('app/vite.config.ts', 'vite.config')).toBe(true);
      expect(shouldSkipTypeScriptFile('app/src/vite-env.d.ts', 'vite-env.d')).toBe(true);
      expect(shouldSkipTypeScriptFile('app/setupTests.ts', 'setupTests')).toBe(true);
      expect(
        shouldSkipTypeScriptFile(
          'app/playwright.docs-media.config.ts',
          'playwright.docs-media.config'
        )
      ).toBe(true);
    });

    it('keeps architectural sources', () => {
      expect(
        shouldSkipTypeScriptFile(
          'app/packages/designer/src/application/forensics/openRefactorOnCanvas.ts',
          'openRefactorOnCanvas'
        )
      ).toBe(false);
      expect(shouldSkipTypeScriptFile('src/domain/graph.ts', 'graph')).toBe(false);
    });
  });

  describe('resolveTypeScriptComponent', () => {
    it('returns null for boilerplate files', () => {
      expect(resolveTypeScriptComponent('app/vitest.config.ts', 'vitest.config')).toBeNull();
    });

    it('rolls up monorepo package paths by folders under src', () => {
      expect(
        resolveTypeScriptComponent(
          'app/packages/designer/src/application/forensics/openRefactorOnCanvas.ts',
          'openRefactorOnCanvas'
        )
      ).toEqual({
        componentId: 'application/forensics',
        componentName: 'Forensics',
      });

      expect(
        resolveTypeScriptComponent(
          'app/packages/cli/src/analysis/domain/modelExtractor.ts',
          'modelExtractor'
        )
      ).toEqual({
        componentId: 'analysis/domain',
        componentName: 'Domain',
      });
    });

    it('keeps package src-root files as leaf components', () => {
      expect(resolveTypeScriptComponent('app/packages/designer/src/App.tsx', 'App')).toEqual({
        componentId: 'app',
        componentName: 'App',
      });
    });

    it('keeps simple-repo leaf files under a single src folder', () => {
      expect(resolveTypeScriptComponent('src/domain/graph.ts', 'graph')).toEqual({
        componentId: 'graph',
        componentName: 'Graph',
      });
      expect(resolveTypeScriptComponent('src/adapters/Canvas.tsx', 'Canvas')).toEqual({
        componentId: 'canvas',
        componentName: 'Canvas',
      });
    });

    it('rolls up files in the same folder to one component', () => {
      const first = resolveTypeScriptComponent(
        'app/packages/core/src/rules/terraformImport.ts',
        'terraformImport'
      );
      const second = resolveTypeScriptComponent(
        'app/packages/core/src/rules/iacImport.ts',
        'iacImport'
      );
      expect(first).toEqual({ componentId: 'rules', componentName: 'Rules' });
      expect(second).toEqual(first);
    });

    it('uses the parent folder when the file name matches the folder (index-style)', () => {
      expect(
        resolveTypeScriptComponent(
          'app/packages/designer/src/ui/features/workspace/components/TraceLensPanel/TraceLensPanel.tsx',
          'TraceLensPanel'
        )
      ).toEqual({
        componentId: 'ui/features',
        componentName: 'Features',
      });
    });
  });

  describe('resolveRelativeTypeScriptImportPath', () => {
    it('resolves sibling and parent-relative imports', () => {
      expect(
        resolveRelativeTypeScriptImportPath(
          'app/packages/core/src/import-iac.ts',
          './rules/terraformImport'
        )
      ).toBe('app/packages/core/src/rules/terraformImport.ts');

      expect(
        resolveRelativeTypeScriptImportPath('src/adapters/Canvas.tsx', '../domain/graph')
      ).toBe('src/domain/graph.ts');
    });
  });

  describe('resolveTypeScriptImportComponentId', () => {
    it('maps import specifiers to rolled-up component ids', () => {
      expect(
        resolveTypeScriptImportComponentId('app/packages/designer/src/db/db.ts', '../App')
      ).toBe('app');

      expect(
        resolveTypeScriptImportComponentId(
          'app/packages/core/src/import-iac.ts',
          './rules/terraformImport'
        )
      ).toBe('rules');
    });
  });

  describe('isTypeScriptSourcePath', () => {
    it('detects TS/JS paths case-insensitively', () => {
      expect(isTypeScriptSourcePath('src/Foo/Bar.ts')).toBe(true);
      expect(isTypeScriptSourcePath('src/Foo/Bar.TS')).toBe(true);
      expect(isTypeScriptSourcePath('src/Foo/Bar.cs')).toBe(false);
    });
  });
});
