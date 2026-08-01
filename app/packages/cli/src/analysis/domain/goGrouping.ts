import {
  resolveRelativeImportPath,
  resolveTrailingFolderComponent,
  type ComponentIdentity,
} from './folderComponentRollup.ts';

const GO_SKIP_DIRS = new Set(['cmd', 'internal', 'pkg', 'vendor', 'src']);

const EMPTY_LAYOUT_ROOTS = new Set<string>();

const STRIP_EXTENSION = /\.go$/i;

export function isGoSourcePath(relativePath: string): boolean {
  return relativePath.replace(/\\/g, '/').toLowerCase().endsWith('.go');
}

/**
 * Roll up Go sources by meaningful package directory.
 * e.g. `internal/resilience/engine.go` → `resilience`
 */
export function resolveGoComponent(
  relativePath: string,
  baseName: string
): ComponentIdentity | null {
  return resolveTrailingFolderComponent(relativePath, baseName, {
    layoutRoots: EMPTY_LAYOUT_ROOTS,
    stripExtension: STRIP_EXTENSION,
    skipSegments: GO_SKIP_DIRS,
  });
}

export function resolveGoImportComponentId(
  fromRelativePath: string,
  moduleSpecifier: string
): string | null {
  const targetPath = resolveRelativeImportPath(fromRelativePath, moduleSpecifier, '.go');
  if (!targetPath) return null;

  const fileName = targetPath.split('/').pop() ?? '';
  const baseName = fileName.replace(STRIP_EXTENSION, '');
  return resolveGoComponent(targetPath, baseName)?.componentId ?? null;
}
