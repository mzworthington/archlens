import { describe, it, expect } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { getNodePosition } from '../lib/nodePosition';
import {
  classifyExternalNodeDirection,
  computeDirectionalExternalPositions,
  positionExternalNodes,
} from './externalNodeLayout';

const schema = (partial: Partial<SystemSchema> & Pick<SystemSchema, 'nodes'>): SystemSchema => ({
  name: 'Demo',
  version: '1.0.0',
  level: 'component',
  dependencies: [],
  ...partial,
});

describe('externalNodeLayout', () => {
  const diagram = schema({
    nodes: [
      {
        entityRef: 'a/core',
        type: 'component',
        name: 'Core',
        position: { x: 200, y: 300 },
      },
      {
        entityRef: 'a/helper',
        type: 'component',
        name: 'Helper',
        position: { x: 500, y: 300 },
      },
      { entityRef: 'a/downstream-ext', type: 'component', name: 'Downstream', external: true },
      { entityRef: 'a/upstream-ext', type: 'component', name: 'Upstream', external: true },
    ],
    dependencies: [
      { from: 'a/core', to: 'a/downstream-ext', type: 'direct-call' },
      { from: 'a/upstream-ext', to: 'a/helper', type: 'direct-call' },
    ],
  });

  it('classifies upstream and downstream externals from dependency direction', () => {
    expect(
      classifyExternalNodeDirection('a/downstream-ext', diagram.nodes, diagram.dependencies)
    ).toEqual({ upstream: false, downstream: true });
    expect(
      classifyExternalNodeDirection('a/upstream-ext', diagram.nodes, diagram.dependencies)
    ).toEqual({ upstream: true, downstream: false });
  });

  it('places upstream externals above and downstream externals below internals', () => {
    const positions = computeDirectionalExternalPositions(diagram.nodes, diagram.dependencies, [
      'a/downstream-ext',
      'a/upstream-ext',
    ]);

    const downstream = positions.get('a/downstream-ext')!;
    const upstream = positions.get('a/upstream-ext')!;

    expect(upstream.y).toBeLessThan(300);
    expect(downstream.y).toBeGreaterThan(300 + 184);
  });

  it('lays out externals in one horizontal row even when the internal graph is narrow', () => {
    const narrowInternals = schema({
      nodes: [
        {
          entityRef: 'a/core',
          type: 'component',
          name: 'Core',
          position: { x: 400, y: 500 },
        },
        {
          entityRef: 'a/child',
          type: 'component',
          name: 'Child',
          position: { x: 400, y: 800 },
        },
        { entityRef: 'a/up-1', type: 'component', name: 'Up 1', external: true },
        { entityRef: 'a/up-2', type: 'component', name: 'Up 2', external: true },
        { entityRef: 'a/up-3', type: 'component', name: 'Up 3', external: true },
      ],
      dependencies: [
        { from: 'a/up-1', to: 'a/core', type: 'direct-call' },
        { from: 'a/up-2', to: 'a/core', type: 'direct-call' },
        { from: 'a/up-3', to: 'a/child', type: 'direct-call' },
      ],
    });

    const positions = computeDirectionalExternalPositions(
      narrowInternals.nodes,
      narrowInternals.dependencies,
      ['a/up-1', 'a/up-2', 'a/up-3']
    );

    const up1 = positions.get('a/up-1')!;
    const up2 = positions.get('a/up-2')!;
    const up3 = positions.get('a/up-3')!;

    expect(up1.y).toBe(up2.y);
    expect(up2.y).toBe(up3.y);
    expect(up1.y).toBeLessThan(500);
    expect(up2.x).toBeGreaterThan(up1.x);
    expect(up3.x).toBeGreaterThan(up2.x);
  });

  it('orders downstream externals by connected internal x (barycenter) to limit crossings', () => {
    const crossed = schema({
      nodes: [
        {
          entityRef: 'a/left',
          type: 'component',
          name: 'Left',
          position: { x: 100, y: 300 },
        },
        {
          entityRef: 'a/right',
          type: 'component',
          name: 'Right',
          position: { x: 700, y: 300 },
        },
        // Alphabetical order would put "zeta" before "alpha-target" incorrectly for edges.
        { entityRef: 'a/zeta-ext', type: 'component', name: 'Zeta', external: true },
        { entityRef: 'a/alpha-ext', type: 'component', name: 'Alpha', external: true },
      ],
      dependencies: [
        { from: 'a/left', to: 'a/zeta-ext', type: 'direct-call' },
        { from: 'a/right', to: 'a/alpha-ext', type: 'direct-call' },
      ],
    });

    const positions = computeDirectionalExternalPositions(crossed.nodes, crossed.dependencies, [
      'a/zeta-ext',
      'a/alpha-ext',
    ]);

    expect(positions.get('a/zeta-ext')!.x).toBeLessThan(positions.get('a/alpha-ext')!.x);
  });

  it('updates only external nodes when positioning on a diagram', () => {
    const positioned = positionExternalNodes(diagram.nodes, diagram.dependencies);
    const core = positioned.find(n => n.entityRef === 'a/core');
    const upstream = positioned.find(n => n.entityRef === 'a/upstream-ext');
    const downstream = positioned.find(n => n.entityRef === 'a/downstream-ext');

    expect(core).toMatchObject({ position: { x: 200, y: 300 } });
    expect(getNodePosition(upstream!)?.y).toBeLessThan(300);
    expect(getNodePosition(downstream!)?.y).toBeGreaterThan(300);
  });

  it('leaves external-only diagrams alone so nodes stay freely movable', () => {
    const externalOnly = schema({
      nodes: [
        {
          entityRef: 'cf/pages',
          type: 'gateway-api',
          name: 'Cloudflare Pages',
          external: true,
          position: { x: 40, y: 80 },
        },
        {
          entityRef: 'cf/r2',
          type: 'rest-api',
          name: 'Cloudflare R2',
          external: true,
          position: { x: 400, y: 80 },
        },
      ],
    });

    const positioned = positionExternalNodes(externalOnly.nodes, externalOnly.dependencies);
    expect(getNodePosition(positioned[0]!)).toEqual({ x: 40, y: 80 });
    expect(getNodePosition(positioned[1]!)).toEqual({ x: 400, y: 80 });
  });
});
