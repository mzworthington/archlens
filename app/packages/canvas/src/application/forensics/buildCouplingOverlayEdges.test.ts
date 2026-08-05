import { describe, expect, it } from 'vitest';
import type { BlueprintRFNode } from '../store/layoutUtils';
import {
  applyCouplingHighlights,
  buildCouplingGhostNodes,
  buildCouplingOverlayEdges,
  buildCouplingSchemaDependencyEdges,
  COUPLING_EDGE_PREFIX,
  filterCouplingFocusNodes,
} from './buildCouplingOverlayEdges';
import { resolveCouplingEdges } from './resolveCouplingEdges';

function node(
  id: string,
  filepath?: string,
  coupledFiles: Array<{ path: string; score: number; sharedCommits: number }> = [],
  entityRef?: string
): BlueprintRFNode {
  return {
    id,
    type: 'blueprintNode',
    position: { x: 0, y: 0 },
    data: {
      id,
      type: 'component',
      name: id,
      properties: filepath ? { filepath } : {},
      entityRef: entityRef ?? id,
      forensics: coupledFiles.length > 0 ? { coupledFiles } : undefined,
    },
  };
}

describe('buildCouplingOverlayEdges', () => {
  it('returns no edges when overlay is disabled', () => {
    const nodes = [
      node('a', 'src/a.ts', [{ path: 'src/b.ts', score: 0.9, sharedCommits: 5 }]),
      node('b', 'src/b.ts'),
    ];
    const refs = resolveCouplingEdges('a', nodes);
    expect(buildCouplingOverlayEdges(nodes, refs, false)).toEqual([]);
  });

  it('builds labeled coupling edges when enabled', () => {
    const nodes = [
      node('a', 'src/a.ts', [{ path: 'src/b.ts', score: 0.9, sharedCommits: 5 }]),
      node('b', 'src/b.ts'),
    ];
    const refs = resolveCouplingEdges('a', nodes);
    const edges = buildCouplingOverlayEdges(nodes, refs, true);
    expect(edges).toHaveLength(1);
    expect(edges[0]!.id).toBe(`${COUPLING_EDGE_PREFIX}a-b`);
    expect(edges[0]!.source).toBe('a');
    expect(edges[0]!.target).toBe('b');
    expect(edges[0]!.label).toBe('0.90');
    expect(edges[0]!.data?.coupling).toBe(true);
  });
});

describe('buildCouplingGhostNodes', () => {
  it('creates dashed ghost nodes for unmapped coupled filepaths', () => {
    const nodes = [
      node('a', 'src/a.ts', [{ path: 'src/missing.ts', score: 0.7, sharedCommits: 3 }]),
    ];
    const refs = resolveCouplingEdges('a', nodes);
    const ghosts = buildCouplingGhostNodes('a', nodes, refs, true);
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0]!.data.couplingGhost).toBe(true);
    expect(ghosts[0]!.data.properties?.filepath).toBe('src/missing.ts');
  });
});

describe('buildCouplingSchemaDependencyEdges', () => {
  it('overlays declared dependencies between coupled peers when enabled', () => {
    const nodes = [
      node('comp-a', 'src/a.ts', [{ path: 'src/b.ts', score: 0.9, sharedCommits: 5 }], 'comp-a'),
      node('comp-b', 'src/b.ts', [], 'comp-b'),
      node('comp-c', 'src/c.ts', [], 'comp-c'),
    ];
    const refs = resolveCouplingEdges('comp-a', nodes);
    const edges = buildCouplingSchemaDependencyEdges(
      'comp-a',
      nodes,
      [],
      [{ from: 'comp-a', to: 'comp-b', type: 'direct-call', description: 'calls b' }],
      refs,
      true,
      true
    );
    expect(edges).toHaveLength(1);
    expect(edges[0]!.source).toBe('comp-a');
    expect(edges[0]!.target).toBe('comp-b');
    expect(edges[0]!.data?.schemaDependency).toBe(true);
  });
});

describe('applyCouplingHighlights', () => {
  it('marks coupled peer nodes when enabled', () => {
    const nodes = [
      node('a', 'src/a.ts', [{ path: 'src/b.ts', score: 0.9, sharedCommits: 5 }]),
      node('b', 'src/b.ts'),
      node('c', 'src/c.ts'),
    ];
    const next = applyCouplingHighlights(nodes, 'a', true);
    expect(next.find(n => n.id === 'b')!.data.couplingHighlight).toBe(true);
    expect(next.find(n => n.id === 'c')!.data.couplingHighlight).toBeFalsy();
    expect(next.find(n => n.id === 'a')!.data.couplingHighlight).toBeFalsy();
  });

  it('clears highlights when disabled', () => {
    const nodes: BlueprintRFNode[] = [
      {
        ...node('b', 'src/b.ts'),
        data: { ...node('b', 'src/b.ts').data, couplingHighlight: true },
      },
    ];
    const next = applyCouplingHighlights(nodes, 'a', false);
    expect(next[0]!.data.couplingHighlight).toBe(false);
  });
});

describe('filterCouplingFocusNodes', () => {
  it('keeps only the selected node and coupled peers when enabled', () => {
    const nodes = [
      node('a', 'src/a.ts', [{ path: 'src/b.ts', score: 0.9, sharedCommits: 5 }]),
      node('b', 'src/b.ts'),
      node('c', 'src/c.ts'),
    ];
    const refs = resolveCouplingEdges('a', nodes);
    const ghosts = buildCouplingGhostNodes('a', nodes, refs, true);
    const next = filterCouplingFocusNodes(nodes, 'a', true, ghosts);
    expect(next.map(n => n.id).sort()).toEqual(['a', 'b']);
  });

  it('returns all nodes when disabled', () => {
    const nodes = [
      node('a', 'src/a.ts', [{ path: 'src/b.ts', score: 0.9, sharedCommits: 5 }]),
      node('b', 'src/b.ts'),
      node('c', 'src/c.ts'),
    ];
    expect(filterCouplingFocusNodes(nodes, 'a', false)).toHaveLength(3);
  });

  it('includes ghost nodes when only unmapped peers exist', () => {
    const nodes = [
      node('a', 'src/a.ts', [{ path: 'src/missing.ts', score: 0.5, sharedCommits: 2 }]),
    ];
    const refs = resolveCouplingEdges('a', nodes);
    const ghosts = buildCouplingGhostNodes('a', nodes, refs, true);
    const next = filterCouplingFocusNodes(nodes, 'a', true, ghosts);
    expect(next.map(n => n.id)).toContain('a');
    expect(next.some(n => n.data.couplingGhost)).toBe(true);
  });
});
