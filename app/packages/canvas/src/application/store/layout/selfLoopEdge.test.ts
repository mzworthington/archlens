import { describe, expect, it } from 'vitest';
import { selfLoopEdgePath } from './selfLoopEdge';

describe('selfLoopEdgePath', () => {
  it('places the self-relationship label outside the node so the stroke is visible', () => {
    const nodeRight = 280;
    const { labelX } = selfLoopEdgePath({
      sourceX: nodeRight,
      sourceY: 92,
      targetX: nodeRight / 2,
      targetY: 184,
    });

    expect(labelX).toBeGreaterThan(nodeRight);
  });
});
