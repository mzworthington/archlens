import type { EntityRef } from '@archlens/core';
import type { BlueprintRFNode } from '../store/layoutUtils';
import { expandGroupVisibility } from '../forensics/filterSelectedDependencyFocus';

function entityRefForNode(node: BlueprintRFNode): EntityRef {
  return (node.data.entityRef ?? node.id) as EntityRef;
}

/**
 * Dim canvas nodes outside the ChaosLens simulation scope (display-only).
 */
export function applySimulationScopeHighlights(
  nodes: BlueprintRFNode[],
  options: {
    enabled: boolean;
    scope?: EntityRef[] | null;
  }
): BlueprintRFNode[] {
  if (!options.enabled || !options.scope?.length) {
    return nodes.map(node => {
      if (!node.data.resilienceOutOfScope) return node;
      return {
        ...node,
        data: {
          ...node.data,
          resilienceOutOfScope: false,
        },
      };
    });
  }

  const inScope = expandGroupVisibility(new Set(options.scope), nodes);
  return nodes.map(node => {
    const entityRef = entityRefForNode(node);
    const resilienceOutOfScope = !inScope.has(entityRef) && !inScope.has(node.id);
    if (node.data.resilienceOutOfScope === resilienceOutOfScope) return node;
    return {
      ...node,
      data: {
        ...node.data,
        resilienceOutOfScope,
      },
    };
  });
}
