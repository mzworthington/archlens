import { describe, it, expect } from 'vitest';
import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';
import { buildHiddenExternalConnectionGhosts } from './hiddenExternalConnectionGhosts';

function node(
  id: string,
  opts: { external?: boolean; x?: number; y?: number } = {}
): BlueprintRFNode {
  return {
    id,
    position: { x: opts.x ?? 0, y: opts.y ?? 0 },
    data: {
      id,
      type: 'component',
      name: id,
      entityRef: id,
      properties: {},
      ...(opts.external ? { external: true } : {}),
    },
    type: 'blueprintNode',
  };
}

function edge(source: string, target: string, id = `edge-${source}-${target}`): BlueprintRFEdge {
  return {
    id,
    source,
    target,
    data: { type: 'direct-call', description: '' },
  };
}

describe('buildHiddenExternalConnectionGhosts', () => {
  const nodes = [
    node('panel', { x: 100, y: 100 }),
    node('app', { x: 300, y: 100 }),
    node('auth', { external: true, x: 500, y: 100 }),
  ];
  const edges = [edge('panel', 'app'), edge('app', 'auth')];

  it('returns empty output when disabled', () => {
    expect(
      buildHiddenExternalConnectionGhosts({
        selectedNodeId: 'panel',
        allNodes: nodes,
        allEdges: edges,
        visibleNodeIds: new Set(['panel', 'app']),
        enabled: false,
      })
    ).toEqual({ ghostNodes: [], ghostEdges: [] });
  });

  it('creates ghost node and dashed edge for hidden external on closure edge', () => {
    const result = buildHiddenExternalConnectionGhosts({
      selectedNodeId: 'panel',
      allNodes: nodes,
      allEdges: edges,
      visibleNodeIds: new Set(['panel', 'app']),
      enabled: true,
    });

    expect(result.ghostNodes).toHaveLength(1);
    expect(result.ghostNodes[0]?.data.name).toBe('auth');
    expect(result.ghostNodes[0]?.data.hiddenExternalGhost).toBe(true);

    expect(result.ghostEdges).toHaveLength(1);
    expect(result.ghostEdges[0]?.id).toBe('edge-app-auth');
    expect(result.ghostEdges[0]?.source).toBe('app');
    expect(result.ghostEdges[0]?.target).toBe('external-ghost-auth');
    expect(result.ghostEdges[0]?.data?.hiddenExternalGhost).toBe(true);
    expect(result.ghostEdges[0]?.style?.strokeDasharray).toBe('6 4');
  });

  it('includes direct hidden external edge from the selection', () => {
    const direct = [node('panel', { x: 0, y: 0 }), node('auth', { external: true })];
    const directEdges = [edge('panel', 'auth')];

    const result = buildHiddenExternalConnectionGhosts({
      selectedNodeId: 'panel',
      allNodes: direct,
      allEdges: directEdges,
      visibleNodeIds: new Set(['panel']),
      enabled: true,
    });

    expect(result.ghostNodes).toHaveLength(1);
    expect(result.ghostEdges[0]?.source).toBe('panel');
    expect(result.ghostEdges[0]?.target).toBe('external-ghost-auth');
  });
});
