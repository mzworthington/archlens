import { describe, expect, it } from 'vitest';
import { attachClosestHandles } from './applyStateHelpers';
import { SELF_LOOP_EDGE_TYPE } from '../../layout/selfLoopEdge';
import type { BlueprintRFEdge, BlueprintRFNode } from '../../layout/mapping';

describe('attachClosestHandles', () => {
  it('routes a dependency from a node to itself as a loop outside the card', () => {
    const node = {
      id: 'shop/api',
      position: { x: 0, y: 0 },
      data: { id: 'shop/api', type: 'rest-api', name: 'API', properties: {} },
    } as BlueprintRFNode;
    const edge = {
      id: 'edge-shop/api-shop/api',
      source: 'shop/api',
      target: 'shop/api',
      type: 'default',
    } as BlueprintRFEdge;

    const [routed] = attachClosestHandles([node], [edge]);

    expect(routed?.type).toBe(SELF_LOOP_EDGE_TYPE);
    expect(routed?.sourceHandle).toBe('right-source');
    expect(routed?.targetHandle).toBe('bottom-target');
  });
});
