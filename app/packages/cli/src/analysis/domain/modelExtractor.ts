import type { SystemNode, SystemDependency } from '@archlens/core';
import { EntityRef, slugify } from '@archlens/core';
import { parseCsprojProjectReferences, resolveCsprojReferencePath } from '@archlens/core/cli';
import {
  resolveContainerFromPath,
  componentMapKey,
  type ResolveContainerOptions,
} from './containerGrouping.ts';
import type { ParsedSourceFile } from './types.ts';
import { classifyParsedSource, dependencyTypeForTarget } from './nodeTypeHydrator.ts';
import {
  classifyCSharpContainer,
  isCSharpSourcePath,
  nodeTypePriority,
  resolveCSharpComponent,
} from './csharpGrouping.ts';
import {
  extractCSharpDependencies,
  extractCsprojContainerDependencies,
  mergeContainerDependencies,
  type CsprojFile,
} from './csharpDependencies.ts';
import {
  extractPythonDependencies,
  isPythonSourcePath,
  resolvePythonComponent,
} from './pythonDependencies.ts';
import {
  isTypeScriptSourcePath,
  resolveTypeScriptComponent,
  resolveTypeScriptImportComponentId,
} from './typescriptGrouping.ts';
import {
  isNodeBuiltinModule,
  isRelativeImport,
  mergeContainerDependency,
  packageNameFromSpecifier,
  resolveWorkspacePackageContainer,
  resolveWorkspacePackageEntryComponentId,
  subpathComponentIdFromSpecifier,
} from './workspacePackages.ts';

export class ModelExtractor {
  public parentRef: string;
  private resolveOptions: ResolveContainerOptions;

  constructor(parentRef: string, resolveOptions: ResolveContainerOptions = {}) {
    this.parentRef = parentRef;
    this.resolveOptions = resolveOptions;
  }

  public extractGraph(sourceFiles: ParsedSourceFile[], csprojFiles: CsprojFile[] = []) {
    const componentNodesMap = new Map<string, SystemNode>();
    const componentDependencies: SystemDependency[] = [];
    const containerNodesMap = new Map<string, SystemNode>();
    const containerDependencies: SystemDependency[] = [];

    for (const file of sourceFiles) {
      const { containerId, displayName } = resolveContainerFromPath(
        file.relativePath,
        this.resolveOptions
      );

      const componentIdentity = this.resolveComponentIdentity(file);
      if (!componentIdentity) continue;

      const { componentId, componentName } = componentIdentity;
      const mapKey = componentMapKey(containerId, componentId);

      const containerRef = EntityRef.child(this.parentRef, containerId);
      const componentRef = EntityRef.child(containerRef, componentId);
      const hydration = classifyParsedSource(file);

      const existing = componentNodesMap.get(mapKey);
      if (existing) {
        if (nodeTypePriority(hydration.type) > nodeTypePriority(existing.type)) {
          existing.type = hydration.type;
          existing.properties = {
            ...existing.properties,
            technology: hydration.technology,
            classification: hydration.reason,
          };
        }
        if (!file.isTestFile) {
          existing.isTest = false;
        }
      } else {
        componentNodesMap.set(mapKey, {
          entityRef: componentRef,
          type: hydration.type,
          name: componentName,
          isTest: !!file.isTestFile,
          properties: {
            filepath: file.relativePath,
            containerId,
            technology: hydration.technology,
            classification: hydration.reason,
          },
        });
      }

      if (!containerNodesMap.has(containerId)) {
        const containerType = isCSharpSourcePath(file.relativePath)
          ? classifyCSharpContainer(displayName, containerId)
          : 'container';

        containerNodesMap.set(containerId, {
          entityRef: containerRef,
          type: containerType,
          name: `${displayName.charAt(0).toUpperCase()}${displayName.slice(1)} Service`,
          isTest: !!file.isTestFile,
        });
      } else if (!file.isTestFile) {
        containerNodesMap.get(containerId)!.isTest = false;
      }
    }

    this.ensureCsprojContainers(csprojFiles, containerNodesMap);

    const findComponent = (containerHint: string | undefined, componentId: string) => {
      if (containerHint) {
        const keyed = componentNodesMap.get(componentMapKey(containerHint, componentId));
        if (keyed) return keyed;
      }
      for (const [key, node] of componentNodesMap) {
        if (key.endsWith(`/${componentId}`) || key === componentId) {
          return node;
        }
      }
      return undefined;
    };

    for (const file of sourceFiles) {
      if (isCSharpSourcePath(file.relativePath) || isPythonSourcePath(file.relativePath)) {
        continue;
      }

      const componentIdentity = this.resolveComponentIdentity(file);
      if (!componentIdentity) continue;

      const fromComponentId = componentIdentity.componentId;
      const { containerId: fromContainerId } = resolveContainerFromPath(
        file.relativePath,
        this.resolveOptions
      );
      const fromComponent = findComponent(fromContainerId, fromComponentId);
      if (!fromComponent) continue;

      for (const imp of [...file.imports, ...(file.reExports ?? [])]) {
        const packageIndex = this.resolveOptions.workspacePackageIndex;
        const workspaceTargetContainerId = packageIndex
          ? resolveWorkspacePackageContainer(imp.moduleSpecifier, packageIndex)
          : null;

        if (workspaceTargetContainerId) {
          const toContainerRef = EntityRef.child(this.parentRef, workspaceTargetContainerId);
          const entryComponentId = resolveWorkspacePackageEntryComponentId(
            workspaceTargetContainerId,
            this.resolveOptions.workspacePackageEntryIndex
          );
          const subpathComponentId = subpathComponentIdFromSpecifier(imp.moduleSpecifier);
          const toComponentId = subpathComponentId ?? entryComponentId;
          const toComponentRef = EntityRef.child(toContainerRef, toComponentId);

          if (fromComponent.entityRef !== toComponentRef) {
            const edgeExists = componentDependencies.some(
              d => d.from === fromComponent.entityRef && d.to === toComponentRef
            );
            if (!edgeExists) {
              componentDependencies.push({
                from: fromComponent.entityRef,
                to: toComponentRef,
                type: 'direct-call',
                description: packageNameFromSpecifier(imp.moduleSpecifier) ?? undefined,
              });
            }
          }

          if (workspaceTargetContainerId !== fromContainerId) {
            mergeContainerDependency(
              containerDependencies,
              EntityRef.child(this.parentRef, fromContainerId),
              toContainerRef
            );
          }
          continue;
        }

        if (!isRelativeImport(imp.moduleSpecifier) || isNodeBuiltinModule(imp.moduleSpecifier)) {
          continue;
        }

        const toComponentId =
          resolveTypeScriptImportComponentId(file.relativePath, imp.moduleSpecifier) ??
          slugify(
            imp.moduleSpecifier
              .split(/[\\/]/)
              .pop()
              ?.replace(/\.(ts|tsx|js|jsx|cs|py)$/, '') || ''
          );
        const toComponent = findComponent(fromContainerId, toComponentId);
        if (!toComponent) continue;
        const toContainerId = String(toComponent.properties?.containerId || '');

        if (fromComponent.entityRef !== toComponent.entityRef) {
          const fromContainerRef = EntityRef.child(this.parentRef, fromContainerId);
          const toContainerRef = EntityRef.child(this.parentRef, toContainerId);
          const edge = dependencyTypeForTarget(toComponent);

          componentDependencies.push({
            from: fromComponent.entityRef,
            to: toComponent.entityRef,
            type: edge.type,
            description: edge.description,
          });

          if (fromContainerId && toContainerId && fromContainerId !== toContainerId) {
            mergeContainerDependency(containerDependencies, fromContainerRef, toContainerRef);
          }
        }
      }
    }

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

    return { componentNodesMap, componentDependencies, containerNodesMap, containerDependencies };
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

  private resolveComponentIdentity(
    file: ParsedSourceFile
  ): { componentId: string; componentName: string } | null {
    if (isCSharpSourcePath(file.relativePath)) {
      return resolveCSharpComponent(file.relativePath, file.baseName);
    }

    if (isPythonSourcePath(file.relativePath)) {
      return resolvePythonComponent(file.relativePath, file.baseName);
    }

    if (isTypeScriptSourcePath(file.relativePath)) {
      return resolveTypeScriptComponent(file.relativePath, file.baseName);
    }

    return {
      componentId: slugify(file.baseName),
      componentName: `${file.baseName} Service`,
    };
  }
}
