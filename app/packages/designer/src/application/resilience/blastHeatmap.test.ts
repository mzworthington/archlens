import { describe, expect, it } from 'vitest';
import type { BlueprintRFNode } from '../store/layoutUtils';
import { applyBlastHeatmap } from './blastHeatmap';

const nodes: BlueprintRFNode[] = [
  {
    id: 'a/web',
    type: 'blueprintNode',
    position: { x: 0, y: 0 },
    data: {
      id: 'a/web',
      type: 'web-app',
      name: 'Web',
      properties: {},
      entityRef: 'a/web',
    },
  },
  {
    id: 'a/api',
    type: 'blueprintNode',
    position: { x: 200, y: 0 },
    data: {
      id: 'a/api',
      type: 'microservice',
      name: 'API',
      properties: {},
      entityRef: 'a/api',
    },
  },
];

describe('applyBlastHeatmap', () => {
  it('attaches transient blast heat without mutating input nodes', () => {
    const heat = new Map([['a/api', 0.9]]);
    const updated = applyBlastHeatmap(nodes, heat, {
      enabled: true,
      spofs: ['a/api'],
      faultTarget: 'a/api',
    });

    expect(nodes[1].data.blastHeat).toBeUndefined();
    expect(updated[1].data.blastHeat).toBe(0.9);
    expect(updated[1].data.isResilienceSpof).toBe(true);
    expect(updated[1].data.isResilienceFaultTarget).toBe(true);
  });

  it('clears blast styling when disabled', () => {
    const heated = applyBlastHeatmap(nodes, new Map([['a/api', 0.5]]), { enabled: true });
    const cleared = applyBlastHeatmap(heated, new Map(), { enabled: false });
    expect(cleared[1].data.blastHeat).toBe(0);
  });
});
