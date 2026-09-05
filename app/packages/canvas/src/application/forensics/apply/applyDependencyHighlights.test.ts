import { describe, it, expect } from 'vitest';
import type { BlueprintRFEdge, BlueprintRFNode } from '../../store/layoutUtils';
import { applyDependencyHighlights } from './applyDependencyHighlights';

function node(id: string): BlueprintRFNode {
  return {
    id,
    position: { x: 0, y: 0 },
    data: {
      id,
      type: 'component',
      name: id,
      entityRef: id,
      properties: {},
    },
    type: 'blueprintNode',
  };
}

function edge(source: string, target: string): BlueprintRFEdge {
  return {
    id: `edge-${source}-${target}`,
    source,
    target,
    data: { type: 'direct-call', description: '' },
  };
}

describe('applyDependencyHighlights', () => {
  const nodes = [node('a'), node('b'), node('c')];
  const edges = [edge('a', 'b'), edge('b', 'c')];

  it('labels upstream and downstream roles when enabled', () => {
    const highlighted = applyDependencyHighlights(nodes, 'b', edges, true);
    expect(highlighted.find(n => n.id === 'b')?.data.dependencyRole).toBe('selected');
    expect(highlighted.find(n => n.id === 'a')?.data.dependencyRole).toBe('upstream');
    expect(highlighted.find(n => n.id === 'c')?.data.dependencyRole).toBe('downstream');
  });

  it('passes nodes through when disabled', () => {
    const highlighted = applyDependencyHighlights(nodes, 'b', edges, false);
    expect(highlighted.find(n => n.id === 'a')?.data.dependencyRole).toBeUndefined();
  });
});
