import type { SystemDependency, SystemNode } from '@archlens/core';
import { slugify } from '@archlens/core';
import {
  componentMapKey,
  resolveContainerFromPath,
  type ResolveContainerOptions,
} from './containerGrouping.ts';
import type { ParsedSourceFile } from './types.ts';
import { dependencyTypeForTarget } from './nodeTypeHydrator.ts';
import { EntityRef } from '@archlens/core';
import { mergeContainerDependencies } from './csharpDependencies.ts';

const PYTHON_LAYOUT_ROOTS = new Set(['src', 'lib', 'app', 'source', 'sources']);

/** Common Python stdlib top-level modules — skip when not in the repo index. */
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

export function resolvePythonComponent(
  relativePath: string,
  baseName: string
): { componentId: string; componentName: string } {
  if (baseName === '__init__') {
    const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
    const parent = parts.length >= 2 ? parts[parts.length - 2]! : 'package';
    return { componentId: slugify(parent), componentName: `${parent} Package` };
  }

  return { componentId: slugify(baseName), componentName: `${baseName} Service` };
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

export function isPythonStdlibModule(moduleSpecifier: string): boolean {
  if (moduleSpecifier.startsWith('.')) return false;
  const root = moduleSpecifier.split('.')[0] ?? moduleSpecifier;
  return PYTHON_STDLIB_MODULES.has(root);
}

export function resolvePythonModuleTarget(
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

  for (const file of sourceFiles) {
    if (!isPythonSourcePath(file.relativePath)) continue;

    const modulePath = modulePathFromPythonFile(file.relativePath);
    if (!modulePath) continue;

    const componentIdentity = resolvePythonComponent(file.relativePath, file.baseName);
    const { containerId } = resolveContainerFromPath(file.relativePath, resolveOptions);
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

  for (const file of sourceFiles) {
    if (!isPythonSourcePath(file.relativePath)) continue;

    const fromIdentity = resolvePythonComponent(file.relativePath, file.baseName);
    const { containerId: fromContainerId } = resolveContainerFromPath(
      file.relativePath,
      resolveOptions
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

export { mergeContainerDependencies };
