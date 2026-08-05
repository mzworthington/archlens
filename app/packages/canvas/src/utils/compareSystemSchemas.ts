import type { SystemSchema } from '@archlens/core';
import {
  compareSystemSchemas as compareCore,
  schemaDiffHasChanges,
  type SchemaDiff as CoreSchemaDiff,
} from '@archlens/core';
import type { SchemaDiff, WorkingCopyNode } from '../core';

function enrichNode(node: CoreSchemaDiff['nodes']['added'][number]): WorkingCopyNode {
  const refParts = node.entityRef.split('/');
  const localId = refParts[refParts.length - 1] || node.entityRef;
  const systemId = refParts[0] || node.filePath;
  return {
    ...node,
    id: localId,
    systemId,
    containerId: refParts.length > 2 ? refParts[1] : undefined,
  };
}

function enrichDiff(diff: CoreSchemaDiff): SchemaDiff {
  return {
    nodes: {
      added: diff.nodes.added.map(enrichNode),
      modified: diff.nodes.modified.map(({ original, current }) => ({
        original: enrichNode(original),
        current: enrichNode(current),
      })),
      deleted: diff.nodes.deleted.map(enrichNode),
    },
    dependencies: diff.dependencies,
  };
}

/**
 * Structural diff of two in-memory schemas (right relative to left baseline).
 * Reuses core compare logic; enriches nodes for Canvas IndexedDB shape.
 */
export function compareSystemSchemas(
  baseline: SystemSchema,
  current: SystemSchema,
  baselinePath = 'baseline',
  currentPath = 'current'
): SchemaDiff {
  return enrichDiff(compareCore(baseline, current, baselinePath, currentPath));
}

export { schemaDiffHasChanges };
