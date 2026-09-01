import { describe, expect, it, vi } from 'vitest';
import {
  mapDomainDepToRFEdge,
  mapDomainDepsToRFEdges,
  mapDomainNodeToRFNode,
  mapDomainNodesToRFNodes,
  rebuildSchemaFromCanvas,
  getAbsoluteNodePosition,
  shouldAutoLayoutOnLoad,
  layoutGroupedDomainNodes,
  getClosestHandles,
  isDesktopViewport,
  resolveDragGroupMembership,
} from './layoutUtils.ts';
import type { NodeType, SystemNode } from '@archlens/core';
import { getNodePosition } from '@archlens/core';
import { groupLayoutDimensions } from '@archlens/core/layout';
import { createBrowserLayoutRegistry } from '../../infrastructure/layout/createBrowserLayoutRegistry';
import type { BlueprintRFNode } from './layout/mapping';

function testRfNode(opts: {
  id: string;
  type: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  parentId?: string;
  extent?: string;
  style?: { width: number; height: number };
  data: {
    name: string;
    type: NodeType;
    properties: Record<string, never>;
    parentEntityRef?: string;
  };
}): BlueprintRFNode {
  return {
    id: opts.id,
    type: opts.type,
    position: opts.position,
    width: opts.width,
    height: opts.height,
    parentId: opts.parentId,
    extent: opts.extent,
    style: opts.style,
    data: {
      id: opts.id,
      ...opts.data,
    },
  };
}

describe('layoutUtils forensics plumbing', () => {
  it('maps node forensics onto RF node data', () => {
    const domain: SystemNode = {
      entityRef: 'sys/svc/comp',
      type: 'component',
      name: 'Comp',
      properties: { filepath: 'src/a.ts' },
      forensics: {
        complexity: 20,
        churn: 5,
        hotspotScore: 0.9,
        classifications: ['hotspot'],
      },
    };

    const rf = mapDomainNodeToRFNode(domain);
    expect(rf.data.forensics).toEqual(domain.forensics);
  });

  it('preserves forensics when rebuilding schema from canvas', () => {
    const rf = mapDomainNodeToRFNode({
      entityRef: 'sys/svc/comp',
      type: 'component',
      name: 'Comp',
      position: { x: 10, y: 20 },
      forensics: {
        complexity: 12,
        authorCount: 1,
        classifications: ['knowledge-silo'],
      },
    });

    const schema = rebuildSchemaFromCanvas('S', '1.0.0', 'component', [rf], [], 'sys/svc');
    expect(schema.nodes[0]?.forensics).toEqual({
      complexity: 12,
      authorCount: 1,
      classifications: ['knowledge-silo'],
    });
  });

  it('preserves git source provenance when rebuilding schema from canvas', () => {
    const rf = mapDomainNodeToRFNode({
      entityRef: 'sys/svc/comp',
      type: 'component',
      name: 'Comp',
    });

    const schema = rebuildSchemaFromCanvas('S', '1.0.0', 'component', [rf], [], 'sys/svc', {
      remoteUrl: 'https://github.com/org/repo',
      scannedAtCommit: 'abc123',
    });
    expect(schema.source).toEqual({
      remoteUrl: 'https://github.com/org/repo',
      scannedAtCommit: 'abc123',
    });
  });
});

describe('mapDomainNodesToRFNodes', () => {
  it('maps group parents and nested children with parentId', () => {
    const rfNodes = mapDomainNodesToRFNodes([
      { entityRef: 'ctx/hub', type: 'group', name: 'Hub', position: { x: 100, y: 100 } },
      {
        entityRef: 'ctx/child',
        type: 'software-system',
        name: 'Child',
        parentEntityRef: 'ctx/hub',
        position: { x: 48, y: 48 },
      },
    ]);

    const group = rfNodes.find(n => n.id === 'ctx/hub');
    const child = rfNodes.find(n => n.id === 'ctx/child');
    expect(group?.type).toBe('blueprintGroup');
    expect(group?.style).toMatchObject({ width: expect.any(Number), height: expect.any(Number) });
    expect(child?.parentId).toBe('ctx/hub');
    expect(child?.position).toEqual({ x: 56, y: 96 });
  });

  it('does not set React Flow parentId for diagram-membership parentEntityRef', () => {
    const rfNodes = mapDomainNodesToRFNodes([
      {
        entityRef: 'archlens/cloudflare/cloudflare-pages',
        type: 'gateway-api',
        name: 'Cloudflare Pages',
        parentEntityRef: 'archlens/cloudflare',
        position: { x: 10, y: 20 },
      },
      {
        entityRef: 'archlens/cloudflare/cloudflare-r2',
        type: 'rest-api',
        name: 'Cloudflare R2',
        parentEntityRef: 'archlens/cloudflare',
        position: { x: 30, y: 40 },
      },
    ]);

    expect(rfNodes).toHaveLength(2);
    for (const node of rfNodes) {
      expect(node.parentId).toBeUndefined();
      expect(node.extent).toBeUndefined();
      expect(node.data.parentEntityRef).toBe('archlens/cloudflare');
    }

    const schema = rebuildSchemaFromCanvas(
      'Cloudflare Infrastructure',
      '1.0.0',
      'container',
      rfNodes,
      [],
      'archlens/cloudflare'
    );
    expect(schema.nodes.every(n => n.parentEntityRef === 'archlens/cloudflare')).toBe(true);
  });

  it('round-trips parentEntityRef through rebuildSchemaFromCanvas', () => {
    const rfNodes = mapDomainNodesToRFNodes([
      { entityRef: 'ctx/hub', type: 'group', name: 'Hub', position: { x: 0, y: 0 } },
      {
        entityRef: 'ctx/child',
        type: 'software-system',
        name: 'Child',
        parentEntityRef: 'ctx/hub',
        position: { x: 10, y: 20 },
      },
    ]);

    const schema = rebuildSchemaFromCanvas('Context', '1.0.0', 'context', rfNodes, [], 'ctx');
    expect(schema.nodes.find(n => n.entityRef === 'ctx/child')?.parentEntityRef).toBe('ctx/hub');
    expect(schema.nodes.find(n => n.entityRef === 'ctx/hub')?.type).toBe('group');
  });
});

describe('getAbsoluteNodePosition', () => {
  it('accumulates parent offsets for nested nodes', () => {
    const nodes = mapDomainNodesToRFNodes([
      { entityRef: 'ctx/hub', type: 'group', name: 'Hub', position: { x: 100, y: 50 } },
      {
        entityRef: 'ctx/child',
        type: 'software-system',
        name: 'Child',
        parentEntityRef: 'ctx/hub',
        position: { x: 48, y: 48 },
      },
    ]);
    const child = nodes.find(n => n.id === 'ctx/child')!;
    const byId = new Map(nodes.map(n => [n.id, n]));
    expect(getAbsoluteNodePosition(child, byId)).toEqual({ x: 156, y: 146 });
  });
});

describe('shouldAutoLayoutOnLoad', () => {
  it('skips auto layout only when every node has saved coordinates', () => {
    expect(
      shouldAutoLayoutOnLoad({
        name: 'Context',
        version: '1.0.0',
        level: 'context',
        nodes: [
          { entityRef: 'ctx/hub', type: 'group', name: 'Hub', position: { x: 0, y: 0 } },
          {
            entityRef: 'ctx/child',
            type: 'software-system',
            name: 'Child',
            parentEntityRef: 'ctx/hub',
            position: { x: 48, y: 48 },
          },
        ],
        dependencies: [],
      })
    ).toBe(false);
  });

  it('runs auto layout when only some nodes have coordinates', () => {
    expect(
      shouldAutoLayoutOnLoad({
        name: 'Cli',
        version: '1.0.0',
        level: 'component',
        nodes: [
          { entityRef: 'cli/a', type: 'background-worker', name: 'A' },
          {
            entityRef: 'cli/b',
            type: 'background-worker',
            name: 'B',
            position: { x: 280, y: 100 },
          },
        ],
        dependencies: [],
      })
    ).toBe(true);
  });

  it('runs auto layout for grouped context when coordinates are absent', () => {
    expect(
      shouldAutoLayoutOnLoad({
        name: 'Context',
        version: '1.0.0',
        level: 'context',
        nodes: [
          { entityRef: 'ctx/hub', type: 'group', name: 'Hub' },
          {
            entityRef: 'ctx/child',
            type: 'software-system',
            name: 'Child',
            parentEntityRef: 'ctx/hub',
          },
        ],
        dependencies: [],
      })
    ).toBe(true);
  });

  it('runs auto layout when nodes are missing coordinates', () => {
    expect(
      shouldAutoLayoutOnLoad({
        name: 'Containers',
        version: '1.0.0',
        level: 'container',
        nodes: [{ entityRef: 'app/api', type: 'rest-api', name: 'API' }],
        dependencies: [],
      })
    ).toBe(true);
  });
});

describe('layoutGroupedDomainNodes', () => {
  it('keeps downstream externals below a multi-child system boundary on initial layout', async () => {
    const children = [
      'backstage/docs-ui',
      'backstage/microsite',
      'backstage/packages',
      'backstage/plugins',
      'backstage/techdocs-s3-storage',
    ];
    const nodes: SystemNode[] = [
      { entityRef: 'backstage/developer', type: 'person', name: 'Developer' },
      { entityRef: 'backstage/system', type: 'group', name: 'Backstage' },
      ...children.map(entityRef => ({
        entityRef,
        type: 'software-system' as const,
        name: entityRef,
        parentEntityRef: 'backstage/system',
      })),
      {
        entityRef: 'backstage/github',
        type: 'software-system',
        name: 'GitHub',
        external: true,
      },
      {
        entityRef: 'backstage/vendor-aws',
        type: 'software-system',
        name: 'AWS',
        external: true,
      },
    ];
    const dependencies = [
      { from: 'backstage/developer', to: 'backstage/system', type: 'direct-call' as const },
      { from: 'backstage/system', to: 'backstage/github', type: 'direct-call' as const },
      { from: 'backstage/system', to: 'backstage/vendor-aws', type: 'direct-call' as const },
    ];

    const laidOut = await layoutGroupedDomainNodes(
      nodes,
      dependencies,
      'dagre',
      createBrowserLayoutRegistry()
    );

    const group = laidOut.find(n => n.entityRef === 'backstage/system')!;
    const groupPos = getNodePosition(group)!;
    const groupHeight = groupLayoutDimensions(children.map(entityRef => ({ entityRef }))).height;
    const github = getNodePosition(laidOut.find(n => n.entityRef === 'backstage/github')!)!;
    const aws = getNodePosition(laidOut.find(n => n.entityRef === 'backstage/vendor-aws')!)!;

    expect(github.y).toBeGreaterThanOrEqual(groupPos.y + groupHeight);
    expect(aws.y).toBeGreaterThanOrEqual(groupPos.y + groupHeight);
  });
});

describe('mapDomainDepsToRFEdges', () => {
  it('drops duplicate from→to edges that would share a React key', () => {
    const dep = {
      from: 'a',
      to: 'b',
      type: 'direct-call' as const,
      description: 'once',
    };
    const edges = mapDomainDepsToRFEdges([dep, { ...dep, description: 'again' }, dep]);
    expect(edges).toHaveLength(1);
    expect(edges[0]?.id).toBe(mapDomainDepToRFEdge(dep).id);
    expect(edges[0]?.data?.description).toBe('once');
  });
});

describe('getClosestHandles', () => {
  const node = (id: string, x: number, y: number) =>
    ({
      id,
      type: 'blueprintNode',
      position: { x, y },
      data: { name: id, type: 'microservice', properties: {} },
    }) as ReturnType<typeof mapDomainNodeToRFNode>;

  it('defaults to TB handles when the target is below the source', () => {
    expect(getClosestHandles(node('a', 0, 0), node('b', 400, 0))).toEqual({
      sourceHandle: 'bottom-source',
      targetHandle: 'top-target',
    });
  });

  it('uses top-to-bottom handles when the target is above the source', () => {
    expect(getClosestHandles(node('a', 0, 200), node('b', 0, 0))).toEqual({
      sourceHandle: 'top-source',
      targetHandle: 'bottom-target',
    });
  });

  it('supports LR routing when requested', () => {
    expect(getClosestHandles(node('a', 0, 0), node('b', 400, 0), undefined, 'LR')).toEqual({
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
    });
  });
});

describe('isDesktopViewport', () => {
  it('returns true when the sm breakpoint matches', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(min-width: 640px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(isDesktopViewport()).toBe(true);

    vi.unstubAllGlobals();
  });

  it('returns false below the sm breakpoint', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(isDesktopViewport()).toBe(false);

    vi.unstubAllGlobals();
  });
});

describe('resolveDragGroupMembership', () => {
  it('parents a node when dragged into a group boundary', () => {
    const groupNode = testRfNode({
      id: 'group-1',
      type: 'blueprintGroup',
      position: { x: 100, y: 100 },
      width: 500,
      height: 500,
      style: { width: 500, height: 500 },
      data: { name: 'Group 1', type: 'group', properties: {} },
    });

    const childNode = testRfNode({
      id: 'node-1',
      type: 'blueprintNode',
      position: { x: 200, y: 200 },
      width: 200,
      height: 100,
      data: { name: 'Child Node', type: 'microservice', properties: {} },
    });

    const updated = resolveDragGroupMembership([groupNode, childNode], ['node-1']);
    const nextChild = updated.find(n => n.id === 'node-1');

    expect(nextChild?.parentId).toBe('group-1');
    expect(nextChild?.data.parentEntityRef).toBe('group-1');
    expect(nextChild?.position).toEqual({ x: 56, y: 96 });
  });

  it('unparents a node when dragged outside its group boundary', () => {
    const groupNode = testRfNode({
      id: 'group-1',
      type: 'blueprintGroup',
      position: { x: 100, y: 100 },
      width: 400,
      height: 400,
      style: { width: 400, height: 400 },
      data: { name: 'Group 1', type: 'group', properties: {} },
    });

    const childNode = testRfNode({
      id: 'node-1',
      type: 'blueprintNode',
      parentId: 'group-1',
      extent: 'parent',
      position: { x: 800, y: 300 }, // Dragged far to the right outside group boundary
      width: 200,
      height: 100,
      data: {
        name: 'Child Node',
        type: 'microservice',
        parentEntityRef: 'group-1',
        properties: {},
      },
    });

    const updated = resolveDragGroupMembership([groupNode, childNode], ['node-1']);
    const nextChild = updated.find(n => n.id === 'node-1');

    expect(nextChild?.parentId).toBeUndefined();
    expect(nextChild?.extent).toBeUndefined();
    expect(nextChild?.data.parentEntityRef).toBeUndefined();
    expect(nextChild?.position).toEqual({ x: 900, y: 400 }); // Absolute position calculated from group offset (100+800, 100+300)
  });

  it('selects innermost group (smallest area) when nested/overlapping', () => {
    const outerGroup = testRfNode({
      id: 'outer-group',
      type: 'blueprintGroup',
      position: { x: 0, y: 0 },
      width: 1000,
      height: 1000,
      style: { width: 1000, height: 1000 },
      data: { name: 'Outer Group', type: 'group', properties: {} },
    });

    const innerGroup = testRfNode({
      id: 'inner-group',
      type: 'blueprintGroup',
      position: { x: 100, y: 100 },
      width: 300,
      height: 300,
      style: { width: 300, height: 300 },
      data: { name: 'Inner Group', type: 'group', properties: {} },
    });

    const childNode = testRfNode({
      id: 'node-1',
      type: 'blueprintNode',
      position: { x: 150, y: 150 },
      width: 100,
      height: 50,
      data: { name: 'Child Node', type: 'microservice', properties: {} },
    });

    const updated = resolveDragGroupMembership([outerGroup, innerGroup, childNode], ['node-1']);
    const nextChild = updated.find(n => n.id === 'node-1');

    expect(nextChild?.parentId).toBe('inner-group');
  });

  it('does not re-parent group containers when dragged', () => {
    const outerGroup = testRfNode({
      id: 'outer-group',
      type: 'blueprintGroup',
      position: { x: 0, y: 0 },
      width: 1000,
      height: 1000,
      style: { width: 1000, height: 1000 },
      data: { name: 'Outer Group', type: 'group', properties: {} },
    });

    const innerGroup = testRfNode({
      id: 'inner-group',
      type: 'blueprintGroup',
      position: { x: 100, y: 100 },
      width: 300,
      height: 300,
      style: { width: 300, height: 300 },
      data: { name: 'Inner Group', type: 'group', properties: {} },
    });

    const updated = resolveDragGroupMembership([outerGroup, innerGroup], ['inner-group']);
    const nextInnerGroup = updated.find(n => n.id === 'inner-group');

    expect(nextInnerGroup?.parentId).toBeUndefined();
  });
});
