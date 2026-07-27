import { describe, expect, it } from 'vitest';
import {
  BLAST_WAVE_MS,
  blastWaveProgress,
  buildBlastRippleFrame,
  computeBlastRippleFrame,
} from './blastRipple';

describe('blastWaveProgress', () => {
  it('stays at zero before the wave reaches the hop', () => {
    expect(blastWaveProgress(100, 1)).toBe(0);
  });

  it('eases in during the hop window and reaches one after', () => {
    const mid = blastWaveProgress(BLAST_WAVE_MS * 1.5, 1);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(blastWaveProgress(BLAST_WAVE_MS * 2, 1)).toBe(1);
  });
});

describe('computeBlastRippleFrame', () => {
  const heat = new Map([
    ['shop/payment', 1],
    ['shop/api', 0.75],
    ['shop/web', 0.56],
  ]);
  const heatHops = new Map([
    ['shop/payment', 0],
    ['shop/api', 1],
    ['shop/web', 2],
  ]);

  it('reveals heat hop-by-hop over time', () => {
    const start = computeBlastRippleFrame(heat, heatHops, 0);
    expect(start.animatedHeat.size).toBe(0);
    expect(start.isAnimating).toBe(true);

    const afterFault = computeBlastRippleFrame(heat, heatHops, BLAST_WAVE_MS);
    expect(afterFault.animatedHeat.get('shop/payment')).toBe(1);
    expect(afterFault.animatedHeat.has('shop/api')).toBe(false);

    const complete = computeBlastRippleFrame(heat, heatHops, BLAST_WAVE_MS * 3);
    expect(complete.animatedHeat.get('shop/web')).toBeCloseTo(0.56, 2);
    expect(complete.isAnimating).toBe(false);
  });

  it('flags nodes in the active wave as rippling', () => {
    const midWave = computeBlastRippleFrame(heat, heatHops, BLAST_WAVE_MS * 1.5);
    expect(midWave.ripplingNodes.has('shop/api')).toBe(true);
    expect(midWave.ripplingNodes.has('shop/payment')).toBe(false);
  });
});

describe('buildBlastRippleFrame', () => {
  it('animates upstream propagation edges when the caller wave is active', () => {
    const heatHops = new Map([
      ['shop/payment', 0],
      ['shop/api', 1],
    ]);
    const heat = new Map([
      ['shop/payment', 1],
      ['shop/api', 0.75],
    ]);
    const edges = [{ id: 'e1', source: 'shop/api', target: 'shop/payment' }];

    const frame = buildBlastRippleFrame(heat, heatHops, BLAST_WAVE_MS * 1.5, edges, ref => ref);

    expect(frame.propagationEdgeKeys.has('e1')).toBe(true);
  });
});
