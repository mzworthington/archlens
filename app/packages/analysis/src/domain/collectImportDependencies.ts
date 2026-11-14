import type { SystemDependency, SystemNode } from '@archlens/core';
import { EntityRef, slugify } from '@archlens/core';
import {
  resolveComponentIdentity,
  resolveImportComponentId,
  usesDedicatedImportPass,
} from './componentResolver';
import { resolveContainerFromPath, type ResolveContainerOptions } from './containerGrouping';
import type { ParsedSourceFile } from './types';
import { dependencyTypeForTarget } from './nodeTypeHydrator';
import {
  isNodeBuiltinModule,
  isRelativeImport,
  mergeContainerDependency,
  packageNameFromSpecifier,
  resolveWorkspacePackageContainer,
  resolveWorkspacePackageEntryComponentId,
  subpathComponentIdFromSpecifier,
} from './workspacePackages';
import { resolveRelativeTypeScriptImportPath } from './typescriptGrouping';
import {
  componentEntityRef,
  findComponentInMap,
  pushUniqueDependency,
} from './modelExtractorHelpers';

export type ImportDependencyMaps = {
  componentNodesMap: Map<string, SystemNode>;
  componentDependencies: SystemDependency[];
  containerDependencies: SystemDependency[];
  fileLevelDependencies: SystemDependency[];
  filepathToFileEntityRef: Map<string, string>;
};

function extractFileSlug(filepath: string): string {
  const fileName = filepath.replace(/\\/g, '/').split('/').pop() ?? '';
  return slugify(fileName.replace(/\.(ts|tsx|js|jsx|go|java|kt|kts|cs|py)$/, ''));
}

function resolveWorkspaceTargetComponentRef(
  parentRef: string,
  resolveOptions: ResolveContainerOptions,
  maps: ImportDependencyMaps,
  workspaceTargetContainerId: string,
  moduleSpecifier: string
): string {
  const entryComponentId = resolveWorkspacePackageEntryComponentId(
    workspaceTargetContainerId,
    resolveOptions.workspacePackageEntryIndex
  );
  const subpathComponentId = subpathComponentIdFromSpecifier(moduleSpecifier);
  const candidateId = subpathComponentId ?? entryComponentId;

  const containerPrefix = `${workspaceTargetContainerId}/`;
  const containerNodes: Array<{ key: string; node: SystemNode }> = [];
  for (const [key, node] of maps.componentNodesMap) {
    if (
      key.startsWith(containerPrefix) ||
      node.properties?.containerId === workspaceTargetContainerId
    ) {
      containerNodes.push({ key, node });
    }
  }

  if (containerNodes.length === 0) {
    return componentEntityRef(parentRef, workspaceTargetContainerId, candidateId);
  }

  const exactKey = `${workspaceTargetContainerId}/${candidateId}`;
  const exactNode = maps.componentNodesMap.get(exactKey);
  if (exactNode?.entityRef) {
    return exactNode.entityRef;
  }

  if (subpathComponentId) {
    const suffixMatch = containerNodes.find(({ key }) => key.endsWith(`/${subpathComponentId}`));
    if (suffixMatch?.node.entityRef) {
      return suffixMatch.node.entityRef;
    }

    const memberFileLists = containerNodes.map(({ node }) => {
      const members = Array.isArray(node.properties?.memberFilepaths)
        ? (node.properties.memberFilepaths as string[])
        : typeof node.properties?.filepath === 'string'
          ? [node.properties.filepath]
          : [];
      return {
        node,
        slugs: members.map(extractFileSlug).filter(Boolean),
      };
    });

    const exactFileMatch = memberFileLists.find(({ slugs }) => slugs.includes(subpathComponentId));
    if (exactFileMatch?.node.entityRef) {
      return exactFileMatch.node.entityRef;
    }

    const affixFileMatch = memberFileLists.find(({ slugs }) =>
      slugs.some(
        slug => slug.endsWith(`-${subpathComponentId}`) || slug.startsWith(`${subpathComponentId}-`)
      )
    );
    if (affixFileMatch?.node.entityRef) {
      return affixFileMatch.node.entityRef;
    }

    const targetTokens = subpathComponentId.split('-').filter(Boolean);
    if (targetTokens.length > 1) {
      const tokenFileMatch = memberFileLists.find(({ slugs }) =>
        slugs.some(slug => {
          const slugTokens = new Set(slug.split('-').filter(Boolean));
          return targetTokens.every(token => slugTokens.has(token));
        })
      );
      if (tokenFileMatch?.node.entityRef) {
        return tokenFileMatch.node.entityRef;
      }
    }
  }

  for (const fallbackId of [
    'index',
    'extension',
    'main',
    'app',
    'cli',
    workspaceTargetContainerId,
  ]) {
    const fallbackNode = maps.componentNodesMap.get(`${workspaceTargetContainerId}/${fallbackId}`);
    if (fallbackNode?.entityRef) {
      return fallbackNode.entityRef;
    }
  }

  const nonTestNode = containerNodes.find(({ node }) => !node.isTest)?.node;
  return (
    nonTestNode?.entityRef ??
    containerNodes[0]?.node.entityRef ??
    componentEntityRef(parentRef, workspaceTargetContainerId, candidateId)
  );
}

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
  const toComponentRef = resolveWorkspaceTargetComponentRef(
    parentRef,
    resolveOptions,
    maps,
    workspaceTargetContainerId,
    moduleSpecifier
  );
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
