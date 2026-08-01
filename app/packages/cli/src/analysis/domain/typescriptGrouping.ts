import { slugify } from '@archlens/core';
import { LAYOUT_IDENTITY_DENYLIST } from './analysisOptions.ts';

const LAYOUT_ROOTS = new Set(['src', 'lib', 'source', 'sources']);

const TYPESCRIPT_EXTENSIONS = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs']);

/** Max folder depth under `src/` for a rolled-up component (after denylist filtering). */
const MAX_COMPONENT_DEPTH = 2;

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

  return false;
}

export function isTypeScriptSourcePath(relativePath: string): boolean {
  const ext = relativePath.replace(/\\/g, '/').split('.').pop()?.toLowerCase();
  return !!ext && TYPESCRIPT_EXTENSIONS.has(ext);
}

function isDeniedSegment(segment: string): boolean {
  return LAYOUT_IDENTITY_DENYLIST.has(segment.toLowerCase());
}

function titleCase(segment: string): string {
  if (!segment) return segment;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

function formatComponentName(componentId: string): string {
  const parts = componentId.split('/').filter(Boolean);
  if (parts.length === 0) return componentId;
  if (parts.length === 1) return titleCase(parts[0]!.replace(/-/g, ' '));
  const last = parts[parts.length - 1]!;
  return titleCase(last.replace(/-/g, ' '));
}

function meaningfulSegmentsUnderSrc(relativePath: string): string[] {
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const fileName = parts[parts.length - 1] ?? '';
  const dirParts = parts.slice(0, -1);

  const layoutIdx = dirParts.findIndex(p => LAYOUT_ROOTS.has(p.toLowerCase()));
  if (layoutIdx < 0) return [];

  const afterLayout = dirParts.slice(layoutIdx + 1);
  const meaningful: string[] = [];
  for (const segment of afterLayout) {
    if (isDeniedSegment(segment)) continue;
    meaningful.push(segment);
  }

  const baseName = fileName.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/i, '');
  if (meaningful.length > 0) {
    const parent = meaningful[meaningful.length - 1]!;
    if (slugify(parent) === slugify(baseName)) {
      meaningful.pop();
    }
  }

  return meaningful;
}

function isMonorepoPackageSrc(relativePath: string): boolean {
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const layoutIdx = parts.findIndex(p => LAYOUT_ROOTS.has(p.toLowerCase()));
  if (layoutIdx <= 0) return false;
  const beforeSrc = parts.slice(0, layoutIdx).map(p => p.toLowerCase());
  return beforeSrc.some(p => ['packages', 'plugins', 'apps', 'libs', 'services'].includes(p));
}

/**
 * Roll up a TypeScript/JavaScript file into a folder-scoped component under its package.
 *
 * Examples:
 * - `packages/designer/src/application/forensics/foo.ts` → `application/forensics`
 * - `src/domain/graph.ts` → `graph` (leaf under the domain container folder)
 * - `packages/designer/src/App.tsx` → `app` (package src root)
 */
export function resolveTypeScriptComponent(
  relativePath: string,
  baseName: string
): { componentId: string; componentName: string } | null {
  if (shouldSkipTypeScriptFile(relativePath, baseName)) return null;

  const meaningful = meaningfulSegmentsUnderSrc(relativePath);
  if (meaningful.length === 0) {
    const leaf = slugify(baseName);
    return { componentId: leaf, componentName: formatComponentName(leaf) };
  }

  if (meaningful.length === 1 && !isMonorepoPackageSrc(relativePath)) {
    const leaf = slugify(baseName);
    return { componentId: leaf, componentName: formatComponentName(leaf) };
  }

  const rolled = meaningful.slice(0, MAX_COMPONENT_DEPTH);
  const componentId = rolled.map(slugify).join('/');
  return {
    componentId,
    componentName: formatComponentName(componentId),
  };
}

/** Resolve a relative import specifier from a source file to a repo-relative path (no extension). */
export function resolveRelativeTypeScriptImportPath(
  fromRelativePath: string,
  moduleSpecifier: string
): string | null {
  if (!moduleSpecifier.startsWith('.')) return null;

  const fromDir = fromRelativePath.replace(/\\/g, '/').split('/').slice(0, -1);
  const specParts = moduleSpecifier.replace(/\\/g, '/').split('/');

  const resolved = [...fromDir];
  for (const part of specParts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(part);
  }

  if (resolved.length === 0) return null;

  const last = resolved[resolved.length - 1] ?? '';
  const extMatch = last.match(/\.(ts|tsx|js|jsx|mjs|cjs)$/i);
  if (extMatch) {
    return resolved.join('/');
  }

  return `${resolved.join('/')}.ts`;
}

/** Infer component id for a relative import target using the same rollup rules as the source file. */
export function resolveTypeScriptImportComponentId(
  fromRelativePath: string,
  moduleSpecifier: string
): string | null {
  const targetPath = resolveRelativeTypeScriptImportPath(fromRelativePath, moduleSpecifier);
  if (!targetPath) return null;

  const fileName = targetPath.split('/').pop() ?? '';
  const baseName = fileName.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/i, '');
  const identity = resolveTypeScriptComponent(targetPath, baseName);
  return identity?.componentId ?? null;
}
