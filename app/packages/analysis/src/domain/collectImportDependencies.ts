import type { SystemDependency, SystemNode } from '@archlens/core';
import { EntityRef, slugify } from '@archlens/core';
import {
  resolveComponentIdentity,
  resolveImportComponentId,
  usesDedicatedImportPass,
} from './componentResolver.ts';
import { resolveContainerFromPath, type ResolveContainerOptions } from './containerGrouping.ts';
import type { ParsedSourceFile } from './types.ts';
import { dependencyTypeForTarget } from './nodeTypeHydrator.ts';
import {
  isNodeBuiltinModule,
  isRelativeImport,
  mergeContainerDependency,
  packageNameFromSpecifier,
  resolveWorkspacePackageContainer,
  resolveWorkspacePackageEntryComponentId,
  subpathComponentIdFromSpecifier,
} from './workspacePackages.ts';
import { resolveRelativeTypeScriptImportPath } from './typescriptGrouping.ts';
import {
  componentEntityRef,
  findComponentInMap,
  pushUniqueDependency,
} from './modelExtractorHelpers.ts';

export type ImportDependencyMaps = {
  componentNodesMap: Map<string, SystemNode>;
  componentDependencies: SystemDependency[];
  containerDependencies: SystemDependency[];
  fileLevelDependencies: SystemDependency[];
  filepathToFileEntityRef: Map<string, string>;
};

function addWorkspacePackageImport(
  parentRef: string,
  resolveOptions: ResolveContainerOptions,
  maps: ImportDependencyMaps,
  {
    fromComponent,
    fromContainerId,
    fromFileRef,
    moduleSpecifier,
    workspaceTargetContainerId,
  }: {
    fromComponent: SystemNode;
    fromContainerId: string;
    fromFileRef: string | undefined;
    moduleSpecifier: string;
    workspaceTargetContainerId: string;
  }
): void {
  const toContainerRef = EntityRef.child(parentRef, workspaceTargetContainerId);
  const entryComponentId = resolveWorkspacePackageEntryComponentId(
    workspaceTargetContainerId,
    resolveOptions.workspacePackageEntryIndex
  );
  const subpathComponentId = subpathComponentIdFromSpecifier(moduleSpecifier);
  const toComponentId = subpathComponentId ?? entryComponentId;
  const toComponentRef = componentEntityRef(parentRef, workspaceTargetContainerId, toComponentId);
  const description = packageNameFromSpecifier(moduleSpecifier) ?? undefined;

  if (fromComponent.entityRef !== toComponentRef) {
    const edgeExists = maps.componentDependencies.some(
      dep => dep.from === fromComponent.entityRef && dep.to === toComponentRef
    );
    if (!edgeExists) {
      maps.componentDependencies.push({
        from: fromComponent.entityRef,
        to: toComponentRef,
        type: 'direct-call',
        description,
      });
    }
    if (fromFileRef && fromFileRef !== toComponentRef) {
      pushUniqueDependency(maps.fileLevelDependencies, {
        from: fromFileRef,
        to: toComponentRef,
        type: 'direct-call',
        description,
      });
    }
  }

  if (workspaceTargetContainerId !== fromContainerId) {
    mergeContainerDependency(
      maps.containerDependencies,
      EntityRef.child(parentRef, fromContainerId),
      toContainerRef
    );
  }
}

function resolveRelativeImportTarget(
  maps: ImportDependencyMaps,
  file: ParsedSourceFile,
  fromContainerId: string,
  moduleSpecifier: string
): SystemNode | undefined {
  if (!isRelativeImport(moduleSpecifier) || isNodeBuiltinModule(moduleSpecifier)) {
    return undefined;
  }

  const toComponentId =
    resolveImportComponentId(file, moduleSpecifier) ??
    slugify(
      moduleSpecifier
        .split(/[\\/]/)
        .pop()
        ?.replace(/\.(ts|tsx|js|jsx|go|java|kt|kts|cs|py)$/, '') || ''
    );
  return findComponentInMap(maps.componentNodesMap, fromContainerId, toComponentId);
}

function pushRelativeFileDependency(
  maps: ImportDependencyMaps,
  {
    file,
    fromComponent,
    fromFileRef,
    moduleSpecifier,
    toComponent,
  }: {
    file: ParsedSourceFile;
    fromComponent: SystemNode;
    fromFileRef: string | undefined;
    moduleSpecifier: string;
    toComponent: SystemNode;
  }
): void {
  if (!fromFileRef) return;

  const targetPath = resolveRelativeTypeScriptImportPath(file.relativePath, moduleSpecifier);
  const toFileRef = targetPath ? maps.filepathToFileEntityRef.get(targetPath) : undefined;
  const edge = dependencyTypeForTarget(toComponent);
  const fileToRef =
    toFileRef ??
    (fromComponent.entityRef !== toComponent.entityRef ? toComponent.entityRef : undefined);

  if (!fileToRef || fromFileRef === fileToRef) return;

  pushUniqueDependency(maps.fileLevelDependencies, {
    from: fromFileRef,
    to: fileToRef,
    type: edge.type,
    description: edge.description,
  });
}

function addRelativeImport(
  parentRef: string,
  maps: ImportDependencyMaps,
  {
    file,
    fromComponent,
    fromContainerId,
    fromFileRef,
    moduleSpecifier,
  }: {
    file: ParsedSourceFile;
    fromComponent: SystemNode;
    fromContainerId: string;
    fromFileRef: string | undefined;
    moduleSpecifier: string;
  }
): void {
  const toComponent = resolveRelativeImportTarget(maps, file, fromContainerId, moduleSpecifier);
  if (!toComponent) return;

  const edge = dependencyTypeForTarget(toComponent);
  pushRelativeFileDependency(maps, {
    file,
    fromComponent,
    fromFileRef,
    moduleSpecifier,
    toComponent,
  });

  if (fromComponent.entityRef === toComponent.entityRef) return;

  maps.componentDependencies.push({
    from: fromComponent.entityRef,
    to: toComponent.entityRef,
    type: edge.type,
    description: edge.description,
  });

  const toContainerId = String(toComponent.properties?.containerId || '');
  if (fromContainerId && toContainerId && fromContainerId !== toContainerId) {
    mergeContainerDependency(
      maps.containerDependencies,
      EntityRef.child(parentRef, fromContainerId),
      EntityRef.child(parentRef, toContainerId)
    );
  }
}

/**
 * Second extractGraph pass: import / re-export edges across component and file levels.
 */
export function collectImportDependencies(
  parentRef: string,
  sourceFiles: readonly ParsedSourceFile[],
  resolveOptions: ResolveContainerOptions,
  maps: ImportDependencyMaps
): void {
  for (const file of sourceFiles) {
    if (usesDedicatedImportPass(file.relativePath)) continue;

    const componentIdentity = resolveComponentIdentity(file);
    if (!componentIdentity) continue;

    const { containerId: fromContainerId } = resolveContainerFromPath(
      file.relativePath,
      resolveOptions
    );
    const fromComponent = findComponentInMap(
      maps.componentNodesMap,
      fromContainerId,
      componentIdentity.componentId
    );
    if (!fromComponent) continue;

    const fromFileRef = maps.filepathToFileEntityRef.get(file.relativePath);
    const packageIndex = resolveOptions.workspacePackageIndex;

    for (const imp of [...file.imports, ...(file.reExports ?? [])]) {
      const workspaceTargetContainerId = packageIndex
        ? resolveWorkspacePackageContainer(imp.moduleSpecifier, packageIndex)
        : null;

      if (workspaceTargetContainerId) {
        addWorkspacePackageImport(parentRef, resolveOptions, maps, {
          fromComponent,
          fromContainerId,
          fromFileRef,
          moduleSpecifier: imp.moduleSpecifier,
          workspaceTargetContainerId,
        });
        continue;
      }

      addRelativeImport(parentRef, maps, {
        file,
        fromComponent,
        fromContainerId,
        fromFileRef,
        moduleSpecifier: imp.moduleSpecifier,
      });
    }
  }
}
