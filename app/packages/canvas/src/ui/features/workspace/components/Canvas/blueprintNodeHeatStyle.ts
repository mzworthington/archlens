import type { CSSProperties } from 'react';

type HeatStyleInput = {
  selected: boolean;
  external?: boolean;
  couplingHighlight?: boolean;
  liteCanvas: boolean;
  isOutOfSimulationScope: boolean;
  showAvailabilityRisk: boolean;
  showIntegrityRisk: boolean;
  showHotspotHeat: boolean;
  hotspotHeat: number;
  blastHeat: number;
  integrityHeat: number;
};

/** Inline styles for hotspot / blast / integrity heatmap overlays on the node shell. */
export function blueprintNodeHeatStyle({
  selected,
  external,
  couplingHighlight,
  liteCanvas,
  isOutOfSimulationScope,
  showAvailabilityRisk,
  showIntegrityRisk,
  showHotspotHeat,
  hotspotHeat,
  blastHeat,
  integrityHeat,
}: HeatStyleInput): CSSProperties {
  return {
    boxShadow:
      selected || external || couplingHighlight || liteCanvas || isOutOfSimulationScope
        ? undefined
        : showAvailabilityRisk
          ? `0 0 ${8 + blastHeat * 16}px rgba(239, 68, 68, ${0.15 + blastHeat * 0.35})`
          : '0 4px 12px rgba(0, 0, 0, 0.25)',
    outline:
      showIntegrityRisk && !liteCanvas
        ? `2px dashed rgba(245, 158, 11, ${0.35 + integrityHeat * 0.45})`
        : undefined,
    outlineOffset: showIntegrityRisk ? '3px' : undefined,
    ...(showHotspotHeat
      ? {
          backgroundImage: `linear-gradient(135deg, rgba(239, 68, 68, ${0.08 + hotspotHeat * 0.35}) 0%, rgba(15, 23, 42, 0.96) 100%)`,
        }
      : {}),
    ...(showAvailabilityRisk
      ? {
          borderColor: `rgba(239, 68, 68, ${0.35 + blastHeat * 0.55})`,
        }
      : {}),
  };
}
