import type { SystemDependency, SystemNode, SystemSchema } from '../models/schema';
import { getNodePosition } from '../lib/nodePosition';
import type { SchemaDiff, SchemaDiffDependency, SchemaDiffNode } from './schemaDiff';

function depId(dep: SystemDependency): string {
  return `${dep.from}::${dep.to}::${dep.type}`;
}

function nodeToDiffNode(node: SystemNode, filePath: string): SchemaDiffNode {
  const position = getNodePosition(node);
  return {
    entityRef: node.entityRef,
    name: node.name,
    type: node.type,
    properties: node.properties ?? {},
    x: position?.x,
    y: position?.y,
    external: node.external,
    isTest: node.isTest,
    filePath,
  };
}

function depToDiffDep(dep: SystemDependency, filePath: string): SchemaDiffDependency {
  return {
    id: `${dep.from}->${dep.to}`,
    fromRef: dep.from,
    toRef: dep.to,
    type: dep.type,
    description: dep.description,
    filePath,
  };
}

/**
 * Structural diff of two in-memory schemas (current relative to baseline).
 */
export function compareSystemSchemas(
  baseline: SystemSchema,
  current: SystemSchema,
  baselinePath = 'baseline',
  currentPath = 'current'
): SchemaDiff {
  const baselineNodeMap = new Map(
    baseline.nodes.map(n => [n.entityRef, nodeToDiffNode(n, baselinePath)])
  );
  const currentNodeMap = new Map(
    current.nodes.map(n => [n.entityRef, nodeToDiffNode(n, currentPath)])
  );
  const baselineDepMap = new Map(
    baseline.dependencies.map(d => [depId(d), depToDiffDep(d, baselinePath)])
  );
  const currentDepMap = new Map(
    current.dependencies.map(d => [depId(d), depToDiffDep(d, currentPath)])
  );

  const diff: SchemaDiff = {
    nodes: { added: [], modified: [], deleted: [] },
    dependencies: { added: [], deleted: [] },
  };

  for (const [entityRef, node] of currentNodeMap.entries()) {
    const original = baselineNodeMap.get(entityRef);
    if (!original) {
      diff.nodes.added.push(node);
      continue;
    }

    const nameChanged = node.name !== original.name;
    const typeChanged = node.type !== original.type;
    const propertiesChanged =
      JSON.stringify(node.properties) !== JSON.stringify(original.properties);
    const positionChanged = node.x !== original.x || node.y !== original.y;
    const externalChanged = node.external !== original.external;
    const isTestChanged = node.isTest !== original.isTest;

    if (
      nameChanged ||
      typeChanged ||
      propertiesChanged ||
      positionChanged ||
      externalChanged ||
      isTestChanged
    ) {
      diff.nodes.modified.push({ original, current: node });
    }
  }

  for (const [entityRef, original] of baselineNodeMap.entries()) {
    if (!currentNodeMap.has(entityRef)) {
      diff.nodes.deleted.push(original);
    }
  }

  for (const [id, dep] of currentDepMap.entries()) {
    if (!baselineDepMap.has(id)) {
      diff.dependencies.added.push(dep);
    }
  }

  for (const [id, dep] of baselineDepMap.entries()) {
    if (!currentDepMap.has(id)) {
      diff.dependencies.deleted.push(dep);
    }
  }

  return diff;
}
