import type { EntityRef } from '@blueprint/core';
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
    ripplingNodes?: ReadonlySet<EntityRef>;
  }
): BlueprintRFNode[] {
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
    const isResilienceFaultTarget =
      options.faultTarget === entityRef || options.faultTarget === node.id;
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

export function blastHeatMinimapColor(intensity: number): string | null {
  if (intensity <= 0) return null;
  const t = Math.min(1, Math.max(0, intensity));
  const r = Math.round(30 + t * (239 - 30));
  const g = Math.round(41 + t * (68 - 41));
  const b = Math.round(59 + t * (68 - 59));
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function integrityHeatMinimapColor(intensity: number): string | null {
  if (intensity <= 0) return null;
  const t = Math.min(1, Math.max(0, intensity));
  const r = Math.round(30 + t * (245 - 30));
  const g = Math.round(41 + t * (158 - 41));
  const b = Math.round(59 + t * (11 - 59));
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, '0');
}
