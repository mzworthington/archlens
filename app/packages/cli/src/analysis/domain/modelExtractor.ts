import type { SystemDependency, SystemNode } from '@archlens/core';
import { EntityRef } from '@archlens/core';
import { parseCsprojProjectReferences, resolveCsprojReferencePath } from '@archlens/core/cli';
import { resolveContainerFromPath, type ResolveContainerOptions } from './containerGrouping.ts';
import type { ParsedSourceFile } from './types.ts';
import { classifyCSharpContainer } from './csharpGrouping.ts';
import {
  extractCSharpDependencies,
  extractCsprojContainerDependencies,
  mergeContainerDependencies,
  type CsprojFile,
} from './csharpDependencies.ts';
import { extractPythonDependencies } from './pythonDependencies.ts';
import { collectSourceGraphNodes } from './collectSourceGraphNodes.ts';
import { collectImportDependencies } from './collectImportDependencies.ts';

export class ModelExtractor {
  public parentRef: string;
  private resolveOptions: ResolveContainerOptions;

  constructor(parentRef: string, resolveOptions: ResolveContainerOptions = {}) {
    this.parentRef = parentRef;
    this.resolveOptions = resolveOptions;
  }

  public extractGraph(sourceFiles: ParsedSourceFile[], csprojFiles: CsprojFile[] = []) {
    const { componentNodesMap, containerNodesMap, fileLevelNodesMap, filepathToFileEntityRef } =
      collectSourceGraphNodes(this.parentRef, sourceFiles, this.resolveOptions);

    this.ensureCsprojContainers(csprojFiles, containerNodesMap);

    const componentDependencies: SystemDependency[] = [];
    const containerDependencies: SystemDependency[] = [];
    const fileLevelDependencies: SystemDependency[] = [];

    collectImportDependencies(this.parentRef, sourceFiles, this.resolveOptions, {
      componentNodesMap,
      componentDependencies,
      containerDependencies,
      fileLevelDependencies,
      filepathToFileEntityRef,
    });

    const csharpDeps = extractCSharpDependencies(
      this.parentRef,
      sourceFiles,
      componentNodesMap,
      containerNodesMap,
      this.resolveOptions
    );
    componentDependencies.push(...csharpDeps.componentDependencies);
    mergeContainerDependencies(containerDependencies, csharpDeps.containerDependencies);

    const pythonDeps = extractPythonDependencies(
      this.parentRef,
      sourceFiles,
      componentNodesMap,
      this.resolveOptions
    );
    componentDependencies.push(...pythonDeps.componentDependencies);
    mergeContainerDependencies(containerDependencies, pythonDeps.containerDependencies);

    const csprojDeps = extractCsprojContainerDependencies(
      this.parentRef,
      csprojFiles,
      containerNodesMap,
      this.resolveOptions
    );
    mergeContainerDependencies(containerDependencies, csprojDeps);

    return {
      componentNodesMap,
      componentDependencies,
      containerNodesMap,
      containerDependencies,
      fileLevelNodesMap,
      fileLevelDependencies,
    };
  }

  private ensureCsprojContainers(
    csprojFiles: CsprojFile[],
    containerNodesMap: Map<string, SystemNode>
  ) {
    const register = (relativePath: string) => {
      const { containerId, displayName } = resolveContainerFromPath(
        relativePath,
        this.resolveOptions
      );
      if (containerNodesMap.has(containerId)) return;

      containerNodesMap.set(containerId, {
        entityRef: EntityRef.child(this.parentRef, containerId),
        type: classifyCSharpContainer(displayName, containerId),
        name: `${displayName.charAt(0).toUpperCase()}${displayName.slice(1)} Service`,
        isTest: false,
      });
    };

    for (const csproj of csprojFiles) {
      const fromPath = csproj.relativePath.replace(/\\/g, '/');
      register(fromPath);
      for (const refPath of parseCsprojProjectReferences(csproj.content)) {
        register(resolveCsprojReferencePath(fromPath, refPath));
      }
    }
  }
}
