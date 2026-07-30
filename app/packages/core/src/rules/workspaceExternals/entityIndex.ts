import { EntityRef as EntityRefUtil, type EntityRef } from '../../models/schema';
import type { LoadedSystemInput, WorkspaceEntity, WorkspaceEntityIndex } from './types';

/**
 * Flatten every node from loaded workspace schemas into a lookup keyed by entityRef.
 */
export function buildWorkspaceEntityIndex(
  loadedSystems: LoadedSystemInput[]
): WorkspaceEntityIndex {
  const byRef = new Map<EntityRef, WorkspaceEntity>();

  for (const system of loadedSystems) {
    const { schema, path } = system;
    for (const node of schema.nodes) {
      if (!node.entityRef) continue;
      const parent = EntityRefUtil.getParent(node.entityRef);
      byRef.set(node.entityRef, {
        entityRef: node.entityRef,
        name: node.name,
        type: node.type,
        sourceSchemaLevel: schema.level,
        sourcePath: path,
        parentContainerRef: schema.level === 'component' && parent ? parent : undefined,
        properties: node.properties,
      });
    }
  }

  return { byRef };
}
