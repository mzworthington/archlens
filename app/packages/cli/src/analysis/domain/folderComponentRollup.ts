import { slugify } from '@archlens/core';
import { LAYOUT_IDENTITY_DENYLIST } from './analysisOptions.ts';

export type ComponentIdentity = {
  componentId: string;
  componentName: string;
};

export const DEFAULT_LAYOUT_ROOTS = new Set(['src', 'lib', 'source', 'sources']);

export const MONOREPO_PACKAGE_ROOTS = new Set(['packages', 'plugins', 'apps', 'libs', 'services']);

/** Max folder depth for a rolled-up component (after denylist filtering). */
export const DEFAULT_MAX_COMPONENT_DEPTH = 2;

export function isDeniedLayoutSegment(segment: string): boolean {
  return LAYOUT_IDENTITY_DENYLIST.has(segment.toLowerCase());
}

export function titleCaseSegment(segment: string): string {
  if (!segment) return segment;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function formatFolderComponentName(componentId: string, layerSuffix?: string): string {
  const parts = componentId.split('/').filter(Boolean);
  if (parts.length === 0) return componentId;
  const last = parts[parts.length - 1]!.replace(/-/g, ' ');
  const label = titleCaseSegment(last);
  return layerSuffix ? `${label} ${layerSuffix}` : label;
}

export function isMonorepoPackageSrc(
  relativePath: string,
  layoutRoots: Set<string> = DEFAULT_LAYOUT_ROOTS
): boolean {
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const layoutStart = resolveLayoutSliceStart(parts.slice(0, -1), layoutRoots);
  if (layoutStart <= 0) return false;
  const beforeSrc = parts.slice(0, layoutStart - 1).map(p => p.toLowerCase());
  return beforeSrc.some(p => MONOREPO_PACKAGE_ROOTS.has(p));
}

/** Index in dirParts where meaningful segments begin (after src/ or packages/<pkg>/src/). */
export function resolveLayoutSliceStart(dirParts: string[], layoutRoots: Set<string>): number {
  const layoutIdx = dirParts.findIndex(p => layoutRoots.has(p.toLowerCase()));
  if (layoutIdx >= 0) return layoutIdx + 1;

  for (let i = 0; i < dirParts.length - 1; i++) {
    if (!MONOREPO_PACKAGE_ROOTS.has(dirParts[i]!.toLowerCase())) continue;
    if (dirParts[i + 1] && dirParts[i + 2]?.toLowerCase() === 'src') {
      return i + 3;
    }
  }

  return -1;
}

export function meaningfulDirSegments(
  relativePath: string,
  options: {
    layoutRoots: Set<string>;
    stripExtension: RegExp;
    skipSegments?: Set<string>;
  }
): string[] {
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const fileName = parts[parts.length - 1] ?? '';
  const dirParts = parts.slice(0, -1);
  const baseName = fileName.replace(options.stripExtension, '');

  const layoutStart = resolveLayoutSliceStart(dirParts, options.layoutRoots);
  const afterLayout =
    layoutStart >= 0 ? dirParts.slice(layoutStart) : options.layoutRoots.size === 0 ? dirParts : [];

  const meaningful: string[] = [];
  for (const segment of afterLayout) {
    const lower = segment.toLowerCase();
    if (options.skipSegments?.has(lower)) continue;
    if (isDeniedLayoutSegment(segment)) continue;
    meaningful.push(segment);
  }

  if (meaningful.length > 0) {
    const parent = meaningful[meaningful.length - 1]!;
    if (slugify(parent) === slugify(baseName)) {
      meaningful.pop();
    }
  }

  return meaningful;
}

export function resolveFolderRolledComponent(
  relativePath: string,
  baseName: string,
  options: {
    layoutRoots?: Set<string>;
    stripExtension: RegExp;
    maxDepth?: number;
    skipSegments?: Set<string>;
    /** When true, a single folder under src in a non-monorepo path rolls up to the file basename. */
    leafWhenSingleSegmentInSimpleRepo?: boolean;
    nameLayerSuffix?: string;
  }
): ComponentIdentity {
  const layoutRoots = options.layoutRoots ?? DEFAULT_LAYOUT_ROOTS;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_COMPONENT_DEPTH;
  const meaningful = meaningfulDirSegments(relativePath, {
    layoutRoots,
    stripExtension: options.stripExtension,
    skipSegments: options.skipSegments,
  });

  if (meaningful.length === 0) {
    const leaf = slugify(baseName);
    return {
      componentId: leaf,
      componentName: formatFolderComponentName(leaf, options.nameLayerSuffix),
    };
  }

  if (
    options.leafWhenSingleSegmentInSimpleRepo &&
    meaningful.length === 1 &&
    !isMonorepoPackageSrc(relativePath, layoutRoots)
  ) {
    const leaf = slugify(baseName);
    return {
      componentId: leaf,
      componentName: formatFolderComponentName(leaf, options.nameLayerSuffix),
    };
  }

  const rolled = meaningful.slice(0, maxDepth);
  const componentId = rolled.map(slugify).join('/');
  return {
    componentId,
    componentName: formatFolderComponentName(componentId, options.nameLayerSuffix),
  };
}

/** Roll up by the trailing package folders (Python-style immediate parent packages). */
export function resolveTrailingFolderComponent(
  relativePath: string,
  baseName: string,
  options: {
    layoutRoots: Set<string>;
    stripExtension: RegExp;
    maxDepth?: number;
    skipSegments?: Set<string>;
  }
): ComponentIdentity {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_COMPONENT_DEPTH;
  const meaningful = meaningfulDirSegments(relativePath, options);

  if (meaningful.length === 0) {
    const leaf = slugify(baseName);
    return { componentId: leaf, componentName: formatFolderComponentName(leaf) };
  }

  const rolled = meaningful.slice(-maxDepth);
  const componentId = rolled.map(slugify).join('/');
  return { componentId, componentName: formatFolderComponentName(componentId) };
}

export function resolveRelativeImportPath(
  fromRelativePath: string,
  moduleSpecifier: string,
  defaultExtension: string
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
  if (optionsHasExtension(last)) return resolved.join('/');

  return `${resolved.join('/')}${defaultExtension}`;
}

function optionsHasExtension(segment: string): boolean {
  return /\.[a-z0-9]+$/i.test(segment);
}
