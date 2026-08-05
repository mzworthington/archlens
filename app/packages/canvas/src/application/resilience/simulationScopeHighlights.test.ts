import { describe, expect, it } from 'vitest';
import type { BlueprintRFNode } from '../store/layoutUtils';
import { applySimulationScopeHighlights } from './simulationScopeHighlights';

function node(id: string, parentId?: string): BlueprintRFNode {
  return {
    id,
    position: { x: 0, y: 0 },
    parentId,
    data: {
      id,
      type: 'microservice',
      name: id,
      properties: {},
      entityRef: id,
    },
  };
}

describe('applySimulationScopeHighlights', () => {
  it('marks nodes outside the simulation scope as out-of-scope', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const next = applySimulationScopeHighlights(nodes, {
      enabled: true,
      scope: ['a', 'b'],
    });

    expect(next.find(n => n.id === 'a')?.data.resilienceOutOfScope).toBe(false);
    expect(next.find(n => n.id === 'b')?.data.resilienceOutOfScope).toBe(false);
    expect(next.find(n => n.id === 'c')?.data.resilienceOutOfScope).toBe(true);
  });

  it('clears out-of-scope styling when disabled', () => {
    const nodes = [
      {
        ...node('a'),
        data: { ...node('a').data, resilienceOutOfScope: true },
      },
    ];

    const next = applySimulationScopeHighlights(nodes, { enabled: false, scope: ['b'] });
    expect(next[0]?.data.resilienceOutOfScope).toBe(false);
  });

  it('keeps group frames visible when a child is in scope', () => {
    const groupNode: BlueprintRFNode = {
      ...node('group'),
      type: 'blueprintGroup',
      data: { ...node('group').data, type: 'group' },
    };
    const nodes = [groupNode, node('child-a', 'group'), node('child-b', 'group'), node('orphan')];

    const next = applySimulationScopeHighlights(nodes, {
      enabled: true,
      scope: ['child-a'],
    });

    expect(next.find(n => n.id === 'group')?.data.resilienceOutOfScope).toBe(false);
    expect(next.find(n => n.id === 'child-a')?.data.resilienceOutOfScope).toBe(false);
    expect(next.find(n => n.id === 'child-b')?.data.resilienceOutOfScope).toBe(false);
    expect(next.find(n => n.id === 'orphan')?.data.resilienceOutOfScope).toBe(true);
  });
});
