import type { EntityRef } from '@archlens/core';
import type { BlueprintRFNode } from '../store/layoutUtils';

/**
 * Attach transient blast-radius heat on canvas nodes (display-only).
 * Does not mutate schema.
 */
export function applyBlastHeatmap(
  nodes: BlueprintRFNode[],
  heat: Map<EntityRef, number>,
  options: {
    enabled: boolean;
    integrityHeat?: Map<EntityRef, number>;
    spofs?: EntityRef[];
    faultTarget?: EntityRef | null;
    faultTargets?: EntityRef[];
    ripplingNodes?: ReadonlySet<EntityRef>;
  }
): BlueprintRFNode[] {
  const faultTargetSet = new Set(
    options.faultTargets ?? (options.faultTarget ? [options.faultTarget] : [])
  );

  if (!options.enabled) {
    return nodes.map(n => {
      if (
        n.data.blastHeat == null &&
        n.data.integrityHeat == null &&
        !n.data.isResilienceSpof &&
        !n.data.isResilienceFaultTarget &&
        !n.data.blastRipple
      ) {
        return n;
      }
      return {
        ...n,
        data: {
          ...n.data,
          blastHeat: 0,
          integrityHeat: 0,
          isResilienceSpof: false,
          isResilienceFaultTarget: false,
          blastRipple: false,
        },
      };
    });
  }

  const spofSet = new Set(options.spofs ?? []);
  const rippling = options.ripplingNodes;
  const integrityMap = options.integrityHeat;
  return nodes.map(node => {
    const entityRef = (node.data.entityRef ?? node.id) as EntityRef;
    const blastHeat = heat.get(entityRef) ?? heat.get(node.id) ?? 0;
    const integrityHeat = integrityMap?.get(entityRef) ?? integrityMap?.get(node.id) ?? 0;
    const isResilienceSpof = spofSet.has(entityRef) || spofSet.has(node.id);
    const isResilienceFaultTarget = faultTargetSet.has(entityRef) || faultTargetSet.has(node.id);
    const blastRipple = !!rippling && (rippling.has(entityRef) || rippling.has(node.id));

    if (
      node.data.blastHeat === blastHeat &&
      node.data.integrityHeat === integrityHeat &&
      node.data.isResilienceSpof === isResilienceSpof &&
      node.data.isResilienceFaultTarget === isResilienceFaultTarget &&
      node.data.blastRipple === blastRipple
    ) {
      return node;
    }

    return {
      ...node,
      data: {
        ...node.data,
        blastHeat,
        integrityHeat,
        isResilienceSpof,
        isResilienceFaultTarget,
        blastRipple,
      },
    };
  });
}

export function blastHeatMinimapColor(blastHeat: number | undefined): string {
  if (!blastHeat || blastHeat <= 0) return '#1e293b';
  const alpha = Math.min(1, blastHeat);
  return `rgba(248, 113, 113, ${0.25 + alpha * 0.65})`;
}

export function integrityHeatMinimapColor(integrityHeat: number | undefined): string {
  if (!integrityHeat || integrityHeat <= 0) return '#1e293b';
  const alpha = Math.min(1, integrityHeat);
  return `rgba(251, 191, 36, ${0.2 + alpha * 0.6})`;
}
