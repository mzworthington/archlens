import type { EntityRef } from '@blueprint/core';
import {
  hasActiveSafeguards,
  mergeNodeSafeguards,
  resolveNodeResilience,
  type NodeSafeguards,
} from '@blueprint/core/resilience';
import type { BlueprintRFNode } from '../store/layoutUtils';

function safeguardsForNode(
  node: BlueprintRFNode,
  sessionSafeguards: Partial<Record<EntityRef, NodeSafeguards>>
): NodeSafeguards | undefined {
  const entityRef = (node.data.entityRef ?? node.id) as EntityRef;
  const persisted = resolveNodeResilience({
    resilience: node.data.resilience,
  });
  const session = sessionSafeguards[entityRef] ?? sessionSafeguards[node.id];
  const merged = mergeNodeSafeguards(persisted, session);
  return hasActiveSafeguards(merged) ? merged : undefined;
}

function safeguardsEqual(a?: NodeSafeguards, b?: NodeSafeguards): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * Attach transient safeguard highlights on canvas nodes (display-only).
 * Active in ChaosLens mode so operators can see protected nodes at a glance.
 */
export function applySafeguardHighlights(
  nodes: BlueprintRFNode[],
  options: {
    enabled: boolean;
    sessionSafeguards?: Partial<Record<EntityRef, NodeSafeguards>>;
  }
): BlueprintRFNode[] {
  if (!options.enabled) {
    return nodes.map(node => {
      if (!node.data.resilienceSafeguards) return node;
      return {
        ...node,
        data: {
          ...node.data,
          resilienceSafeguards: undefined,
        },
      };
    });
  }

  const sessionSafeguards = options.sessionSafeguards ?? {};
  return nodes.map(node => {
    const resilienceSafeguards = safeguardsForNode(node, sessionSafeguards);
    if (safeguardsEqual(node.data.resilienceSafeguards, resilienceSafeguards)) {
      return node;
    }
    return {
      ...node,
      data: {
        ...node.data,
        resilienceSafeguards,
      },
    };
  });
}
