import { describe, expect, it } from 'vitest';
import { blueprintNodeHeatStyle } from './blueprintNodeHeatStyle';

describe('blueprintNodeHeatStyle', () => {
  it('marks hotspot heat with a flat light tint', () => {
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

    expect(style.backgroundImage).toBeUndefined();
    expect(style.backgroundColor).toBe('color-mix(in srgb, #b42318 12%, var(--color-surface))');
    expect(style['--hotspot-fill' as keyof typeof style]).toBe(
      'color-mix(in srgb, #b42318 12%, white)'
    );
    expect(style.boxShadow ?? '').not.toContain('gradient');
    expect(style.boxShadow ?? '').not.toContain('inset');
  });
});
