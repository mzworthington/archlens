import type { SystemDependency, SystemNode } from '@archlens/core';
import { EntityRef, slugify } from '@archlens/core';
import {
  componentMapKey,
  resolveContainerFromPath,
  type ResolveContainerOptions,
} from './containerGrouping';
import {
  formatFolderComponentName,
  meaningfulDirSegments,
  type ComponentIdentity,
} from './folderComponentRollup';
import { dependencyTypeForTarget } from './nodeTypeHydrator';
import type { ParsedSourceFile } from './types';

const PYTHON_LAYOUT_ROOTS = new Set(['src', 'lib', 'app', 'source', 'sources']);

const PYTHON_STRIP_EXTENSION = /\.py$/i;

/** Common Python stdlib top-level modules - skip when not in the repo index. */
const PYTHON_STDLIB_MODULES = new Set([
  'abc',
  'argparse',
  'ast',
  'asyncio',
  'collections',
  'contextlib',
  'copy',
  'csv',
  'dataclasses',
  'datetime',
  'decimal',
  'enum',
  'functools',
  'hashlib',
  'http',
  'importlib',
  'inspect',
  'io',
  'itertools',
  'json',
  'logging',
  'math',
  'os',
  'pathlib',
  're',
  'socket',
  'sqlite3',
  'string',
  'subprocess',
  'sys',
  'tempfile',
  'textwrap',
  'threading',
  'time',
  'typing',
  'unittest',
  'urllib',
  'uuid',
  'warnings',
  'xml',
]);

export type PythonModuleTarget = {
  containerId: string;
  componentId: string;
};

export function isPythonSourcePath(relativePath: string): boolean {
  return relativePath.replace(/\\/g, '/').toLowerCase().endsWith('.py');
}

/** Container identity for Python: skip a shared src-layout distribution package so layers become peers. */
export function resolvePythonContainerFromPath(
  relativePath: string,
  options: ResolveContainerOptions = {},
  distributionPackage?: string | null
): { containerId: string; displayName: string } {
  const generic = resolveContainerFromPath(relativePath, options);
  if (!distributionPackage) return generic;

  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const layoutIdx = parts.findIndex(part => PYTHON_LAYOUT_ROOTS.has(part.toLowerCase()));
  if (layoutIdx < 0) return generic;

  const distribution = parts[layoutIdx + 1];
  const layer = parts[layoutIdx + 2];
  if (!distribution || !layer || parts.length < layoutIdx + 4) return generic;
  if (distribution !== distributionPackage) return generic;
  if (generic.containerId !== slugify(distribution)) return generic;

  return { containerId: slugify(layer), displayName: layer };
}

export function sharedPythonDistributionPackage(
  sourceFiles: readonly { relativePath: string }[]
): string | null {
  const layersByRoot = new Map<string, Set<string>>();
  for (const file of sourceFiles) {
    if (!isPythonSourcePath(file.relativePath)) continue;
    const modulePath = modulePathFromPythonFile(file.relativePath);
    if (!modulePath) continue;
    const parts = modulePath.split('.').filter(Boolean);
    const root = parts[0];
    const layer = parts[1];
    if (!root || !layer) continue;
    const layers = layersByRoot.get(root) ?? new Set<string>();
    layers.add(layer);
    layersByRoot.set(root, layers);
  }
  if (layersByRoot.size !== 1) return null;
  const [root, layers] = [...layersByRoot.entries()][0]!;
  return layers.size >= 2 ? root : null;
}

export function modulePathFromPythonFile(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, '/');
  if (!normalized.endsWith('.py')) return null;

  let parts = normalized.slice(0, -3).split('/').filter(Boolean);
  if (parts[parts.length - 1] === '__init__') {
    parts = parts.slice(0, -1);
  }

  while (parts.length > 0 && PYTHON_LAYOUT_ROOTS.has(parts[0]!.toLowerCase())) {
    parts.shift();
  }

  if (parts.length === 0) return null;
  return parts.join('.');
}

function shouldSkipPythonFile(relativePath: string, baseName: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/');
  if (/\/migrations\//i.test(normalized)) return true;
  if (baseName === 'conftest') return true;
  if (baseName === 'setup') return true;
  return false;
}

export function resolvePythonComponent(
  relativePath: string,
  baseName: string
): ComponentIdentity | null {
  if (shouldSkipPythonFile(relativePath, baseName)) return null;

  const meaningful = meaningfulDirSegments(relativePath, {
    layoutRoots: PYTHON_LAYOUT_ROOTS,
    stripExtension: PYTHON_STRIP_EXTENSION,
  });

  if (meaningful.length === 0) {
    const leaf = slugify(baseName);
    return { componentId: leaf, componentName: formatFolderComponentName(leaf) };
  }

  const parentFolder = meaningful[meaningful.length - 1]!;
  const componentId = slugify(parentFolder);
  return { componentId, componentName: formatFolderComponentName(componentId) };
}

function pythonPackageContext(relativePath: string, modulePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized.endsWith('/__init__.py') || normalized.endsWith('__init__.py')) {
    return modulePath;
  }

  const parts = modulePath.split('.');
  return parts.length > 1 ? parts.slice(0, -1).join('.') : '';
}

function resolveRelativePythonImport(packageContext: string, specifier: string): string | null {
  let dots = 0;
  while (dots < specifier.length && specifier[dots] === '.') dots++;
  if (dots === 0) return null;

  const rest = specifier.slice(dots);
  const baseParts = packageContext ? packageContext.split('.').filter(Boolean) : [];
  const levelsUp = dots - 1;
  if (levelsUp > baseParts.length) return null;

  const resolved = baseParts.slice(0, baseParts.length - levelsUp);
  if (rest) {
    resolved.push(...rest.split('.').filter(Boolean));
  }

  return resolved.length > 0 ? resolved.join('.') : null;
}

function isPythonStdlibModule(moduleSpecifier: string): boolean {
  if (moduleSpecifier.startsWith('.')) return false;
  const root = moduleSpecifier.split('.')[0] ?? moduleSpecifier;
  return PYTHON_STDLIB_MODULES.has(root);
}

function pythonIndexRoots(index: Map<string, PythonModuleTarget>): Set<string> {
  const roots = new Set<string>();
  for (const modulePath of index.keys()) {
    const root = modulePath.split('.')[0];
    if (root) roots.add(root);
  }
  return roots;
}

function lookupPythonModulePrefix(
  specifier: string,
  index: Map<string, PythonModuleTarget>
): PythonModuleTarget | undefined {
  const parts = specifier.split('.').filter(Boolean);
  for (let i = parts.length; i >= 1; i--) {
    const candidate = parts.slice(0, i).join('.');
    const found = index.get(candidate);
    if (found) return found;
  }
  return undefined;
}

function resolvePythonModuleTarget(
  specifier: string,
  index: Map<string, PythonModuleTarget>
): PythonModuleTarget | undefined {
  const direct = lookupPythonModulePrefix(specifier, index);
  if (direct) return direct;

  // Scan roots inside a src-layout package drop the distribution name from paths
  // (`features/library.py`) while imports still use `romini.features.library`.
  const roots = pythonIndexRoots(index);
  const parts = specifier.split('.').filter(Boolean);
  for (let i = 1; i < parts.length; i++) {
    if (!roots.has(parts[i]!)) continue;
    const remainder = parts.slice(i);
    if (remainder.length < 2) return undefined;
    return lookupPythonModulePrefix(remainder.join('.'), index);
  }
  return undefined;
}

export function resolvePythonImport(
  relativePath: string,
  moduleSpecifier: string,
  index: Map<string, PythonModuleTarget>
): PythonModuleTarget | undefined {
  if (isPythonStdlibModule(moduleSpecifier)) return undefined;

  const currentModule = modulePathFromPythonFile(relativePath);
  if (!currentModule) return undefined;

  let resolvedSpecifier = moduleSpecifier;
  if (moduleSpecifier.startsWith('.')) {
    const packageContext = pythonPackageContext(relativePath, currentModule);
    const relative = resolveRelativePythonImport(packageContext, moduleSpecifier);
    if (!relative) return undefined;
    resolvedSpecifier = relative;
  }

  return resolvePythonModuleTarget(resolvedSpecifier, index);
}

export function buildPythonModuleIndex(
  sourceFiles: ParsedSourceFile[],
  resolveOptions: ResolveContainerOptions
): Map<string, PythonModuleTarget> {
  const index = new Map<string, PythonModuleTarget>();
  const distributionPackage = sharedPythonDistributionPackage(sourceFiles);

  for (const file of sourceFiles) {
    if (!isPythonSourcePath(file.relativePath)) continue;

    const modulePath = modulePathFromPythonFile(file.relativePath);
    if (!modulePath) continue;

    const componentIdentity = resolvePythonComponent(file.relativePath, file.baseName);
    if (!componentIdentity) continue;
    const { containerId } = resolvePythonContainerFromPath(
      file.relativePath,
      resolveOptions,
      distributionPackage
    );
    index.set(modulePath, {
      containerId,
      componentId: componentIdentity.componentId,
    });
  }

  return index;
}

function pushContainerDependency(
  containerDependencies: SystemDependency[],
  parentRef: string,
  fromContainerId: string,
  toContainerId: string
) {
  if (!fromContainerId || !toContainerId || fromContainerId === toContainerId) return;

  const fromRef = EntityRef.child(parentRef, fromContainerId);
  const toRef = EntityRef.child(parentRef, toContainerId);
  const exists = containerDependencies.some(d => d.from === fromRef && d.to === toRef);
  if (exists) return;

  containerDependencies.push({
    from: fromRef,
    to: toRef,
    type: 'inter-container',
  });
}

export function extractPythonDependencies(
  parentRef: string,
  sourceFiles: ParsedSourceFile[],
  componentNodesMap: Map<string, SystemNode>,
  resolveOptions: ResolveContainerOptions
): { componentDependencies: SystemDependency[]; containerDependencies: SystemDependency[] } {
  const componentDependencies: SystemDependency[] = [];
  const containerDependencies: SystemDependency[] = [];
  const moduleIndex = buildPythonModuleIndex(sourceFiles, resolveOptions);
  const distributionPackage = sharedPythonDistributionPackage(sourceFiles);

  for (const file of sourceFiles) {
    if (!isPythonSourcePath(file.relativePath)) continue;

    const fromIdentity = resolvePythonComponent(file.relativePath, file.baseName);
    if (!fromIdentity) continue;
    const { containerId: fromContainerId } = resolvePythonContainerFromPath(
      file.relativePath,
      resolveOptions,
      distributionPackage
    );
    const fromComponent = componentNodesMap.get(
      componentMapKey(fromContainerId, fromIdentity.componentId)
    );
    if (!fromComponent) continue;

    for (const imp of file.imports) {
      const target = resolvePythonImport(file.relativePath, imp.moduleSpecifier, moduleIndex);
      if (!target) continue;

      const toComponent = componentNodesMap.get(
        componentMapKey(target.containerId, target.componentId)
      );
      if (!toComponent || fromComponent.entityRef === toComponent.entityRef) continue;

      const edge = dependencyTypeForTarget(toComponent);
      const edgeExists = componentDependencies.some(
        d => d.from === fromComponent.entityRef && d.to === toComponent.entityRef
      );
      if (!edgeExists) {
        componentDependencies.push({
          from: fromComponent.entityRef,
          to: toComponent.entityRef,
          type: edge.type,
          description: edge.description,
        });
      }

      pushContainerDependency(
        containerDependencies,
        parentRef,
        fromContainerId,
        target.containerId
      );
    }
  }

  return { componentDependencies, containerDependencies };
}
