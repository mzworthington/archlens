import {
  DEFAULT_MAX_COMPONENT_DEPTH,
  isMonorepoPackageSrc,
  meaningfulDirSegments,
  resolveFolderRolledComponent,
  resolveRelativeImportPath,
  type ComponentIdentity,
} from './folderComponentRollup.ts';

const LAYOUT_ROOTS = new Set(['src', 'lib', 'source', 'sources']);

const TYPESCRIPT_EXTENSIONS = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs']);

const STRIP_EXTENSION = /\.(ts|tsx|js|jsx|mjs|cjs)$/i;

/** Boilerplate TypeScript/JavaScript sources that add noise without architectural signal. */
export function shouldSkipTypeScriptFile(relativePath: string, baseName: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/');
  const lower = baseName.toLowerCase();

  if (lower.endsWith('.d') || /\.d\.[^./]+$/i.test(baseName)) return true;
  if (/\.config$/i.test(lower)) return true;
  if (/^setuptests$/i.test(lower)) return true;
  if (/^jest\.config/i.test(lower)) return true;
  if (/^vitest\.config/i.test(lower)) return true;
  if (/^playwright/i.test(lower) && /config/i.test(lower)) return true;
  if (/^vite\.config/i.test(lower)) return true;
  if (/^webpack\.config/i.test(lower)) return true;
  if (/^eslint\.config/i.test(lower)) return true;
  if (/\/vite-env\.d\.[^/]+$/i.test(normalized)) return true;
  if (/\/(tests?|e2e|__tests__|playwright)(\/|$)/i.test(normalized)) return true;

  return false;
}

export function isTypeScriptSourcePath(relativePath: string): boolean {
  const ext = relativePath.replace(/\\/g, '/').split('.').pop()?.toLowerCase();
  return !!ext && TYPESCRIPT_EXTENSIONS.has(ext);
}

/**
 * Roll up a TypeScript/JavaScript file into a folder-scoped component under its package.
 */
export function resolveTypeScriptComponent(
  relativePath: string,
  baseName: string
): ComponentIdentity | null {
  if (shouldSkipTypeScriptFile(relativePath, baseName)) return null;

  return resolveFolderRolledComponent(relativePath, baseName, {
    layoutRoots: LAYOUT_ROOTS,
    stripExtension: STRIP_EXTENSION,
    maxDepth: DEFAULT_MAX_COMPONENT_DEPTH,
    leafWhenSingleSegmentInSimpleRepo: true,
  });
}

/** Resolve a relative import specifier from a source file to a repo-relative path. */
export function resolveRelativeTypeScriptImportPath(
  fromRelativePath: string,
  moduleSpecifier: string
): string | null {
  return resolveRelativeImportPath(fromRelativePath, moduleSpecifier, '.ts');
}

/** Infer component id for a relative import target using the same rollup rules as the source file. */
export function resolveTypeScriptImportComponentId(
  fromRelativePath: string,
  moduleSpecifier: string
): string | null {
  const targetPath = resolveRelativeTypeScriptImportPath(fromRelativePath, moduleSpecifier);
  if (!targetPath) return null;

  const fileName = targetPath.split('/').pop() ?? '';
  const baseName = fileName.replace(STRIP_EXTENSION, '');
  return resolveTypeScriptComponent(targetPath, baseName)?.componentId ?? null;
}

// Re-export for tests that assert monorepo + segment helpers.
export { isMonorepoPackageSrc, meaningfulDirSegments };
