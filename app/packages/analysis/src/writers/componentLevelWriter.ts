import { BaseWriter } from './baseWriter.ts';
import type { SystemNode, SystemDependency, SystemSchema, SourceProvenance } from '@archlens/core';
import { EntityRef, parseSchemaFromYaml } from '@archlens/core';
import { seedPreservedPositions } from '@archlens/core/layout';
import { resolveSystemEntityRef } from '../domain/entityRefContext.ts';
import { buildRollupDrillDownSchemas } from './rollupDrillDown.ts';

function stripRollupMetadata(nodes: SystemNode[]): SystemNode[] {
  return nodes.map(node => {
    if (!node.properties?.memberFilepaths) return node;
    const { memberFilepaths: _memberFilepaths, ...restProperties } = node.properties;
    return {
      ...node,
      properties: Object.keys(restProperties).length > 0 ? restProperties : undefined,
    };
  });
}

/** Rollup nodes with a drill-down diagram should not carry a misleading representative filepath. */
function stripDrillDownFilepaths(
  nodes: SystemNode[],
  drillDownEntityRefs: ReadonlySet<string>
): SystemNode[] {
  return nodes.map(node => {
    if (!node.entityRef || !drillDownEntityRefs.has(node.entityRef)) return node;
    if (typeof node.properties?.filepath !== 'string') return node;
    const { filepath: _filepath, ...restProperties } = node.properties;
    return {
      ...node,
      properties: Object.keys(restProperties).length > 0 ? restProperties : undefined,
    };
  });
}

export class ComponentLevelWriter extends BaseWriter {
  async write(
    blueprintsDir: string,
    contextName: string,
    systemId: string,
    componentNodesMap: Map<string, SystemNode>,
    componentDependencies: SystemDependency[],
    containerNodesMap: Map<string, SystemNode>,
    source?: SourceProvenance,
    fileLevelNodesMap: Map<string, SystemNode> = new Map(),
    fileLevelDependencies: SystemDependency[] = []
  ): Promise<void> {
    const systemRef = resolveSystemEntityRef(contextName, systemId);

    for (const [containerId, containerNode] of containerNodesMap.entries()) {
      const internalComponents = Array.from(componentNodesMap.values()).filter(
        c => c.properties?.containerId === containerId
      );

      const internalEdges = componentDependencies.filter(
        edge =>
          EntityRef.getContainerId(edge.from) === containerId ||
          EntityRef.getContainerId(edge.to) === containerId
      );

      const containerRef = EntityRef.child(systemRef, containerId);
      const slugifiedContainerId = EntityRef.leaf(containerRef);

      const componentPath = this.fileSystem.getAbsolutePath(
        blueprintsDir,
        `${slugifiedContainerId}-components.yaml`
      );
      const drillDownSchemas = buildRollupDrillDownSchemas(
        containerRef,
        internalComponents,
        [...fileLevelNodesMap.values()],
        fileLevelDependencies,
        source,
        [...componentNodesMap.values()]
      );
      const drillDownEntityRefs = new Set(
        drillDownSchemas
          .map(entry => entry.schema.entityRef)
          .filter(
            (entityRef): entityRef is string =>
              typeof entityRef === 'string' && entityRef.length > 0
          )
      );

      const nodes = await this.seedFromDisk(
        componentPath,
        stripDrillDownFilepaths(stripRollupMetadata(internalComponents), drillDownEntityRefs)
      );

      const componentSchema: SystemSchema = {
        entityRef: containerRef,
        name: `${containerNode.name} Components`,
        version: '1.0.0',
        level: 'component',
        nodes,
        dependencies: internalEdges,
        ...(source ? { source } : {}),
      };

      await this.writeYaml(componentPath, componentSchema);
      this.logger.info(`📄 Saved Component schema for [${containerRef}]: ${componentPath}`);

      for (const { relativePath, schema } of drillDownSchemas) {
        const drillDownPath = this.fileSystem.getAbsolutePath(blueprintsDir, relativePath);
        const drillDownNodes = await this.seedFromDisk(
          drillDownPath,
          stripDrillDownFilepaths(stripRollupMetadata(schema.nodes), drillDownEntityRefs)
        );
        const drillDownSchema: SystemSchema = {
          ...schema,
          nodes: drillDownNodes,
        };
        await this.writeYaml(drillDownPath, drillDownSchema);
        this.logger.info(
          `📄 Saved Rollup drill-down schema for [${schema.entityRef}]: ${drillDownPath}`
        );
      }
    }
  }

  private async seedFromDisk(targetPath: string, nextNodes: SystemNode[]): Promise<SystemNode[]> {
    if (!this.fileSystem.exists(targetPath)) return nextNodes;
    try {
      const existing = parseSchemaFromYaml(await this.fileSystem.readSchema(targetPath));
      return seedPreservedPositions(existing.nodes ?? [], nextNodes);
    } catch {
      return nextNodes;
    }
  }
}
