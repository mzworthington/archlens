import type { SystemNode } from '../../models/schema';
import type { WorkspaceEntity } from './types';

const EXTERNAL_NAME_SUFFIX = ' (External)';

function externalDisplayName(name: string): string {
  return name.includes('(External)') ? name : `${name}${EXTERNAL_NAME_SUFFIX}`;
}

/**
 * Create external proxy nodes for the active diagram from workspace entities.
 */
export function materializeExternalNodes(
  entities: WorkspaceEntity[],
  positions: Array<{ x: number; y: number }>
): SystemNode[] {
  return entities.map((entity, index) => {
    const position = positions[index] ?? { x: 100 + index * 180, y: 100 };
    return {
      entityRef: entity.entityRef,
      type: entity.type,
      name: externalDisplayName(entity.name),
      external: true,
      properties: entity.properties ? { ...entity.properties } : undefined,
      position: { x: position.x, y: position.y },
    };
  });
}
