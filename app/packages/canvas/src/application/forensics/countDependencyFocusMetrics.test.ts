import { describe, it, expect } from 'vitest';
import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';
import { countDependencyFocusMetrics } from './countDependencyFocusMetrics';

function node(id: string, external = false): BlueprintRFNode {
  return {
    id,
    position: { x: 0, y: 0 },
    data: {
      id,
      type: 'component',
      name: id,
      entityRef: id,
      properties: {},
      ...(external ? { external: true } : {}),
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

describe('countDependencyFocusMetrics', () => {
  const nodes = [node('a'), node('b'), node('auth', true)];
  const edges = [edge('a', 'b'), edge('b', 'auth')];

  it('returns zeros when mode is full or unselected', () => {
    expect(countDependencyFocusMetrics(null, nodes, edges, 'focus')).toEqual({
      internalCount: 0,
      externalInTree: 0,
      externalHidden: 0,
    });
    expect(countDependencyFocusMetrics('b', nodes, edges, 'full')).toEqual({
      internalCount: 0,
      externalInTree: 0,
      externalHidden: 0,
    });
  });

  it('reports hidden externals in focus mode', () => {
    expect(countDependencyFocusMetrics('b', nodes, edges, 'focus')).toEqual({
      internalCount: 2,
      externalInTree: 0,
      externalHidden: 1,
    });
  });

  it('includes externals in focus-externals mode', () => {
    expect(countDependencyFocusMetrics('b', nodes, edges, 'focus-externals')).toEqual({
      internalCount: 2,
      externalInTree: 1,
      externalHidden: 0,
    });
  });
});
