import type { C4Level, NodeType } from '@archlens/core';
import { NODE_TYPES } from './nodeTypes';

export function resolvePropertyPanelTitle({
  isResilienceMode,
  isEdge,
  isNode,
  nodeType,
  schemaLevel,
}: {
  isResilienceMode: boolean;
  isEdge: boolean;
  isNode: boolean;
  nodeType: NodeType | undefined;
  schemaLevel: C4Level;
}): string {
  if (isResilienceMode) return 'ChaosLens';
  if (isEdge) return 'Dependency';
  if (isNode) {
    return NODE_TYPES.find(entry => entry.type === nodeType)?.label || 'Component';
  }
  if (schemaLevel === 'component' || schemaLevel === 'code') return 'Diagram';
  return 'Canvas';
}
