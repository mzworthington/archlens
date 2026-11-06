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
  const restShadow =
    selected || external || couplingHighlight || liteCanvas || isOutOfSimulationScope
      ? undefined
      : showAvailabilityRisk
        ? `0 0 ${8 + blastHeat * 16}px rgba(239, 68, 68, ${0.15 + blastHeat * 0.35})`
        : '0 4px 12px rgba(0, 0, 0, 0.25)';
  const hotspotTint = showHotspotHeat ? Math.round(6 + hotspotHeat * 8) : undefined;

  return {
    boxShadow: restShadow,
    ...(hotspotTint == null
      ? {}
      : {
          backgroundColor: `color-mix(in srgb, #b42318 ${hotspotTint}%, #061125)`,
          '--hotspot-fill': `color-mix(in srgb, #b42318 ${hotspotTint}%, white)`,
        }),
    outline:
      showIntegrityRisk && !liteCanvas
        ? `2px dashed rgba(245, 158, 11, ${0.35 + integrityHeat * 0.45})`
        : undefined,
    outlineOffset: showIntegrityRisk ? '3px' : undefined,
    ...(showAvailabilityRisk
      ? {
          borderColor: `rgba(239, 68, 68, ${0.35 + blastHeat * 0.55})`,
        }
      : {}),
  };
}
