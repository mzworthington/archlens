import { describe, it, expect } from 'vitest';
import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';
import {
  buildDependencyGraphModel,
  collectDependencyNeighborhood,
  collectDependencyNeighborhoodWithExternals,
  collectDownstreamNeighborhood,
  collectUpstreamNeighborhood,
  filterSelectedDependencyFocusNodes,
  resolveDependencyRoles,
} from './filterSelectedDependencyFocus';

function node(id: string, options?: { parentId?: string; isGroup?: boolean }): BlueprintRFNode {
  return {
    id,
    position: { x: 0, y: 0 },
    ...(options?.parentId ? { parentId: options.parentId } : {}),
    data: {
      id,
      type: options?.isGroup ? 'group' : 'component',
      name: id,
      entityRef: id,
      properties: {},
    },
    type: options?.isGroup ? 'blueprintGroup' : 'blueprintNode',
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

describe('filterSelectedDependencyFocus', () => {
  // a → b → c ← orphan
  // a → d
  const nodes = [node('a'), node('b'), node('c'), node('d'), node('orphan')];
  const edges = [edge('a', 'b'), edge('b', 'c'), edge('a', 'd'), edge('orphan', 'c')];

  it('collects selected node plus transitive upstream and downstream neighbors', () => {
    const visible = collectDependencyNeighborhood('a', nodes, edges);
    expect([...visible].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('includes upstream dependents when selecting a mid-chain node', () => {
    const visible = collectDependencyNeighborhood('b', nodes, edges);
    expect([...visible].sort()).toEqual(['a', 'b', 'c']);
    expect(visible.has('d')).toBe(false);
    expect(visible.has('orphan')).toBe(false);
  });

  it('includes all transitive upstream callers when selecting a leaf', () => {
    const visible = collectDependencyNeighborhood('c', nodes, edges);
    expect([...visible].sort()).toEqual(['a', 'b', 'c', 'orphan']);
    expect(visible.has('d')).toBe(false);
  });

  it('does not include sibling-only branches via a shared upstream', () => {
    const visible = collectDependencyNeighborhood('b', nodes, edges);
    expect(visible.has('d')).toBe(false);
  });

  it('filters nodes when enabled; passes through when disabled or unselected', () => {
    expect(filterSelectedDependencyFocusNodes(nodes, edges, 'a', false)).toHaveLength(5);
    expect(filterSelectedDependencyFocusNodes(nodes, edges, null, true)).toHaveLength(5);

    const focused = filterSelectedDependencyFocusNodes(nodes, edges, 'a', true);
    expect(focused.map(n => n.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps upstream callers when focusing a dependency target', () => {
    const focused = filterSelectedDependencyFocusNodes(nodes, edges, 'c', true);
    expect(focused.map(n => n.id).sort()).toEqual(['a', 'b', 'c', 'orphan']);
  });

  it('includes all group children when the caller connects to the group shell', () => {
    const grouped = [
      node('user'),
      node('hub', { isGroup: true }),
      node('api', { parentId: 'hub' }),
      node('db', { parentId: 'hub' }),
      node('orphan'),
    ];
    const groupedEdges = [edge('user', 'hub')];

    const visible = collectDependencyNeighborhood('user', grouped, groupedEdges);
    expect([...visible].sort()).toEqual(['api', 'db', 'hub', 'user']);

    const focused = filterSelectedDependencyFocusNodes(grouped, groupedEdges, 'user', true);
    expect(focused.map(n => n.id).sort()).toEqual(['api', 'db', 'hub', 'user']);
  });

  it('includes upstream callers of a grouped child via the group edge', () => {
    const grouped = [
      node('user'),
      node('hub', { isGroup: true }),
      node('api', { parentId: 'hub' }),
      node('db', { parentId: 'hub' }),
    ];
    const groupedEdges = [edge('user', 'hub')];

    const visible = collectDependencyNeighborhood('api', grouped, groupedEdges);
    expect([...visible].sort()).toEqual(['api', 'db', 'hub', 'user']);
  });

  it('collectUpstreamNeighborhood returns only incoming transitive callers', () => {
    const upstream = collectUpstreamNeighborhood('b', nodes, edges);
    expect([...upstream].sort()).toEqual(['a', 'b']);
    expect(upstream.has('c')).toBe(false);
    expect(upstream.has('d')).toBe(false);
  });

  it('collectDownstreamNeighborhood returns only outgoing transitive targets', () => {
    const downstream = collectDownstreamNeighborhood('b', nodes, edges);
    expect([...downstream].sort()).toEqual(['b', 'c']);
    expect(downstream.has('a')).toBe(false);
    expect(downstream.has('d')).toBe(false);
  });

  it('buildDependencyGraphModel assigns hop distances and totals', () => {
    const model = buildDependencyGraphModel('b', nodes, edges);
    expect(model.upstream).toEqual([{ entityRef: 'a', name: 'a', hop: 1 }]);
    expect(model.downstream).toEqual([{ entityRef: 'c', name: 'c', hop: 1 }]);
    expect(model.upstreamTotal).toBe(1);
    expect(model.downstreamTotal).toBe(1);
  });

  it('resolveDependencyRoles labels upstream and downstream peers', () => {
    const roles = resolveDependencyRoles('b', nodes, edges);
    expect(roles.get('b')).toBe('selected');
    expect(roles.get('a')).toBe('upstream');
    expect(roles.get('c')).toBe('downstream');
    expect(roles.has('d')).toBe(false);
  });

  it('collectDependencyNeighborhoodWithExternals adds externals on closure edges', () => {
    const withExternal = [
      node('a'),
      node('b'),
      node('c'),
      {
        ...node('auth'),
        data: {
          ...node('auth').data,
          external: true,
        },
      },
    ];
    const externalEdges = [edge('a', 'b'), edge('b', 'c'), edge('c', 'auth')];

    const focusOnly = collectDependencyNeighborhood('b', withExternal, externalEdges);
    expect(focusOnly.has('auth')).toBe(false);

    const withExternals = collectDependencyNeighborhoodWithExternals(
      'b',
      withExternal,
      externalEdges,
      true
    );
    expect(withExternals.has('auth')).toBe(true);
    expect(withExternals.has('a')).toBe(true);
  });

  it('filterSelectedDependencyFocusNodes includes externals when requested', () => {
    const withExternal = [
      node('a'),
      node('b'),
      {
        ...node('auth'),
        data: { ...node('auth').data, external: true },
      },
    ];
    const externalEdges = [edge('a', 'b'), edge('b', 'auth')];

    const focused = filterSelectedDependencyFocusNodes(
      withExternal,
      externalEdges,
      'b',
      true,
      true
    );
    expect(focused.map(n => n.id).sort()).toEqual(['a', 'auth', 'b']);
  });
});
