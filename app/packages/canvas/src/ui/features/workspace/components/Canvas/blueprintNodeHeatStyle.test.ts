import { describe, expect, it } from 'vitest';
import { blueprintNodeHeatStyle } from './blueprintNodeHeatStyle';

describe('blueprintNodeHeatStyle', () => {
  it('uses opaque linear gradient base when hotspot heat is active', () => {
    const style = blueprintNodeHeatStyle({
      selected: false,
      external: false,
      couplingHighlight: false,
      liteCanvas: false,
      isOutOfSimulationScope: false,
      showAvailabilityRisk: false,
      showIntegrityRisk: false,
      showHotspotHeat: true,
      hotspotHeat: 0.8,
      blastHeat: 0,
      integrityHeat: 0,
    });

    expect(style.backgroundImage).toContain('rgba(15, 23, 42, 1)');
    expect(style.backgroundImage).not.toContain('rgba(15, 23, 42, 0.96)');
  });
});
