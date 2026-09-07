import type { NodePosition, SystemNode } from '../models/schema';

export type { NodePosition };

/** Node shape that may still carry legacy flat coordinates during wire parse. */
export type PositionableNode = Pick<SystemNode, 'position'> & { x?: number; y?: number };

export function getNodePosition(node: PositionableNode): NodePosition | undefined {
  if (node.position && Number.isFinite(node.position.x) && Number.isFinite(node.position.y)) {
    return { x: node.position.x, y: node.position.y };
  }

  if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
    return { x: node.x!, y: node.y! };
  }

  return undefined;
}

export function hasFinitePosition(node: PositionableNode): boolean {
  return getNodePosition(node) !== undefined;
}

export function withNodePosition(node: SystemNode, position: NodePosition): SystemNode {
  return {
    ...node,
    position: { x: position.x, y: position.y },
  };
}

export function withoutNodePosition(node: SystemNode): SystemNode {
  const { position: _position, ...rest } = node;
  return rest;
}
