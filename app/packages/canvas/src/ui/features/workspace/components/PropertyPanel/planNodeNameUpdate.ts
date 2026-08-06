import type { SystemNode, SystemSchema } from '@archlens/core';
import { slugify } from '@archlens/core';

export type NodeNameUpdate = {
  name: string;
  entityRef?: string;
};

/**
 * Plan a node rename: slugify the display name into entityRef when unique.
 */
export function planNodeNameUpdate(
  schema: SystemSchema,
  selectedNode: SystemNode,
  rfNodeId: string,
  newName: string
): NodeNameUpdate {
  const newId = slugify(newName).replace(/_/g, '-');
  if (!newId || newId === rfNodeId) {
    return { name: newName };
  }

  const idExists = schema.nodes.some(node => {
    if (node.entityRef === selectedNode.entityRef) return false;
    return node.entityRef === newId || (node.entityRef && node.entityRef.endsWith('/' + newId));
  });

  if (idExists) return { name: newName };
  return { name: newName, entityRef: newId };
}
