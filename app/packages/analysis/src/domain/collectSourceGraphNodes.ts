import type { SystemNode } from '@archlens/core';
import { EntityRef } from '@archlens/core';
import { resolveComponentIdentity } from './componentResolver.ts';
import {
  resolveContainerFromPath,
  componentMapKey,
  type ResolveContainerOptions,
} from './containerGrouping.ts';
import type { ParsedSourceFile } from './types.ts';
import { classifyParsedSource } from './nodeTypeHydrator.ts';
import { classifyCSharpContainer, isCSharpSourcePath } from './csharpGrouping.ts';
import { fileLeafEntityRef } from '../writers/rollupDrillDown.ts';
import {
  appendMemberFilepath,
  applyHydrationUpgrade,
  componentEntityRef,
  fileDisplayName,
} from './modelExtractorHelpers.ts';

export type SourceGraphNodeMaps = {
  componentNodesMap: Map<string, SystemNode>;
  containerNodesMap: Map<string, SystemNode>;
  fileLevelNodesMap: Map<string, SystemNode>;
  filepathToFileEntityRef: Map<string, string>;
};

function upsertComponentNode(
  maps: SourceGraphNodeMaps,
  {
    mapKey,
    componentRef,
    componentName,
    containerId,
    file,
    hydration,
  }: {
    mapKey: string;
    componentRef: string;
    componentName: string;
    containerId: string;
    file: ParsedSourceFile;
    hydration: ReturnType<typeof classifyParsedSource>;
  }
): void {
  const existing = maps.componentNodesMap.get(mapKey);
  if (existing) {
    applyHydrationUpgrade(existing, hydration, !!file.isTestFile);
    appendMemberFilepath(existing, file.relativePath);
    return;
  }

  maps.componentNodesMap.set(mapKey, {
    entityRef: componentRef,
    type: hydration.type,
    name: componentName,
    isTest: !!file.isTestFile,
    properties: {
      filepath: file.relativePath,
      memberFilepaths: [file.relativePath],
      containerId,
      technology: hydration.technology,
      classification: hydration.reason,
    } as unknown as SystemNode['properties'],
  });
}

function upsertFileLevelNode(
  maps: SourceGraphNodeMaps,
  {
    fileEntityRef,
    containerId,
    file,
    hydration,
  }: {
    fileEntityRef: string;
    containerId: string;
    file: ParsedSourceFile;
    hydration: ReturnType<typeof classifyParsedSource>;
  }
): void {
  const existingFileNode = maps.fileLevelNodesMap.get(fileEntityRef);
  if (existingFileNode) {
    applyHydrationUpgrade(existingFileNode, hydration, !!file.isTestFile);
    return;
  }

  maps.fileLevelNodesMap.set(fileEntityRef, {
    entityRef: fileEntityRef,
    type: hydration.type,
    name: fileDisplayName(file.baseName),
    isTest: !!file.isTestFile,
    properties: {
      filepath: file.relativePath,
      containerId,
      technology: hydration.technology,
      classification: hydration.reason,
    },
  });
}

function upsertContainerNode(
  maps: SourceGraphNodeMaps,
  {
    parentRef,
    containerId,
    displayName,
    file,
  }: {
    parentRef: string;
    containerId: string;
    displayName: string;
    file: ParsedSourceFile;
  }
): void {
  if (!maps.containerNodesMap.has(containerId)) {
    const containerType = isCSharpSourcePath(file.relativePath)
      ? classifyCSharpContainer(displayName, containerId)
      : 'container';

    maps.containerNodesMap.set(containerId, {
      entityRef: EntityRef.child(parentRef, containerId),
      type: containerType,
      name: `${displayName.charAt(0).toUpperCase()}${displayName.slice(1)} Service`,
      isTest: !!file.isTestFile,
    });
    return;
  }

  if (!file.isTestFile) {
    maps.containerNodesMap.get(containerId)!.isTest = false;
  }
}

/**
 * First extractGraph pass: component, file-level and container nodes from sources.
 */
export function collectSourceGraphNodes(
  parentRef: string,
  sourceFiles: readonly ParsedSourceFile[],
  resolveOptions: ResolveContainerOptions
): SourceGraphNodeMaps {
  const maps: SourceGraphNodeMaps = {
    componentNodesMap: new Map(),
    containerNodesMap: new Map(),
    fileLevelNodesMap: new Map(),
    filepathToFileEntityRef: new Map(),
  };

  for (const file of sourceFiles) {
    const { containerId, displayName } = resolveContainerFromPath(
      file.relativePath,
      resolveOptions
    );

    const componentIdentity = resolveComponentIdentity(file);
    if (!componentIdentity) continue;

    const { componentId, componentName } = componentIdentity;
    const mapKey = componentMapKey(containerId, componentId);
    const componentRef = componentEntityRef(parentRef, containerId, componentId);
    const hydration = classifyParsedSource(file);
    const fileEntityRef = fileLeafEntityRef(componentRef, file.baseName);
    maps.filepathToFileEntityRef.set(file.relativePath, fileEntityRef);

    upsertComponentNode(maps, {
      mapKey,
      componentRef,
      componentName,
      containerId,
      file,
      hydration,
    });
    upsertFileLevelNode(maps, {
      fileEntityRef,
      containerId,
      file,
      hydration,
    });
    upsertContainerNode(maps, {
      parentRef,
      containerId,
      displayName,
      file,
    });
  }

  return maps;
}
