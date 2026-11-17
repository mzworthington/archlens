import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import type {
  BlueprintRFEdge,
  BlueprintRFNode,
} from '../../../../../application/store/layoutUtils';
import { buildCanvasVisibleNodes } from './canvasDisplayGraph';

function node(
  id: string,
  opts: { external?: boolean; type?: BlueprintRFNode['data']['type']; isTest?: boolean } = {}
): BlueprintRFNode {
  return {
    id,
    position: { x: 0, y: 0 },
    data: {
      id,
      type: opts.type ?? 'component',
      name: id,
      entityRef: id,
      properties: {},
      ...(opts.external ? { external: true } : {}),
      ...(opts.isTest ? { isTest: true } : {}),
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

function contextFixture() {
  const schema: SystemSchema = {
    name: 'Context',
    version: '1.0.0',
    level: 'context',
    nodes: [
      { entityRef: 'app/user', type: 'person', name: 'User' },
      { entityRef: 'app', type: 'software-system', name: 'App' },
      { entityRef: 'app/psp', type: 'gateway-api', name: 'PSP', external: true },
      { entityRef: 'app/orphan-ext', type: 'microservice', name: 'Orphan Ext', external: true },
    ],
    dependencies: [
      { from: 'app/user', to: 'app', type: 'direct-call' },
      { from: 'app', to: 'app/psp', type: 'direct-call' },
    ],
  };
  const nodes = [
    node('app/user', { type: 'person' }),
    node('app', { type: 'software-system' }),
    node('app/psp', { external: true, type: 'gateway-api' }),
    node('app/orphan-ext', { external: true }),
  ];
  const edges = [edge('app/user', 'app'), edge('app', 'app/psp')];
  return { schema, nodes, edges };
}

function containerFocusFixture() {
  const schema: SystemSchema = {
    name: 'App',
    version: '1.0.0',
    level: 'container',
    nodes: [
      { entityRef: 'app', type: 'component', name: 'App' },
      { entityRef: 'caller', type: 'component', name: 'Caller', external: true },
      { entityRef: 'target', type: 'component', name: 'Target', external: true },
      { entityRef: 'peer', type: 'component', name: 'Peer' },
      { entityRef: 'stranger', type: 'component', name: 'Stranger' },
    ],
    dependencies: [
      { from: 'caller', to: 'app', type: 'direct-call' },
      { from: 'app', to: 'target', type: 'direct-call' },
      { from: 'app', to: 'peer', type: 'direct-call' },
    ],
  };
  const nodes = [
    node('app'),
    node('caller', { external: true }),
    node('target', { external: true }),
    node('peer'),
    node('stranger'),
  ];
  const edges = [edge('caller', 'app'), edge('app', 'target'), edge('app', 'peer')];
  return { schema, nodes, edges };
}

function visibleIds(flags: { callers: boolean; targets: boolean }): string[] {
  const { schema, nodes, edges } = containerFocusFixture();
  return buildCanvasVisibleNodes({
    nodes,
    edges,
    schema,
    loadedSystems: [{ path: 'app.yaml', name: schema.name, schema }],
    showTests: true,
    showUpstreamExternals: flags.callers,
    showDownstreamExternals: flags.targets,
    selectedNodeId: 'app',
    dependencyViewMode: 'focus-externals',
    isResilienceMode: false,
    simulationScopeSet: null,
    showCoupling: false,
    expandedExternalHub: null,
  })
    .map(n => n.id)
    .sort();
}

describe('buildCanvasVisibleNodes - dependency focus externals', () => {
  it('shows only the external band the caller and target toggles enable', () => {
    expect(visibleIds({ callers: true, targets: false })).toEqual(['app', 'caller', 'peer']);
    expect(visibleIds({ callers: false, targets: true })).toEqual(['app', 'peer', 'target']);
    expect(visibleIds({ callers: true, targets: true })).toEqual([
      'app',
      'caller',
      'peer',
      'target',
    ]);
  });

  it('hides neighborhood externals when both caller and target toggles are off', () => {
    expect(visibleIds({ callers: false, targets: false })).toEqual(['app', 'peer']);
  });
});

describe('buildCanvasVisibleNodes - C4 context level', () => {
  it('always shows actors and external dependencies at context level', () => {
    const { schema, nodes, edges } = contextFixture();
    const visible = buildCanvasVisibleNodes({
      nodes,
      edges,
      schema,
      loadedSystems: [{ path: 'context.yaml', name: schema.name, schema }],
      showTests: true,
      showUpstreamExternals: false,
      showDownstreamExternals: false,
      selectedNodeId: null,
      dependencyViewMode: 'full',
      isResilienceMode: false,
      simulationScopeSet: null,
      showCoupling: false,
      expandedExternalHub: null,
    });

    expect(visible.map(n => n.id).sort()).toEqual(['app', 'app/orphan-ext', 'app/psp', 'app/user']);
  });

  it('keeps actors and externals visible under dependency focus at context level', () => {
    const { schema, nodes, edges } = contextFixture();
    const visible = buildCanvasVisibleNodes({
      nodes,
      edges,
      schema,
      loadedSystems: [{ path: 'context.yaml', name: schema.name, schema }],
      showTests: true,
      showUpstreamExternals: true,
      showDownstreamExternals: true,
      selectedNodeId: 'app/psp',
      dependencyViewMode: 'focus-externals',
      isResilienceMode: false,
      simulationScopeSet: null,
      showCoupling: false,
      expandedExternalHub: null,
    });

    const ids = new Set(visible.map(n => n.id));
    expect(ids.has('app/user')).toBe(true);
    expect(ids.has('app/psp')).toBe(true);
    expect(ids.has('app/orphan-ext')).toBe(true);
    expect(ids.has('app')).toBe(true);
  });
});
