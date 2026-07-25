import { describe, it, expect } from 'vitest';
import { searchWorkspaceNodes } from './searchWorkspaceNodes';
import type { SystemSchema } from '@blueprint/core';

const baseSchema = (
  name: string,
  nodes: SystemSchema['nodes'],
  dependencies: SystemSchema['dependencies'] = []
): SystemSchema => ({
  name,
  version: '1.0.0',
  level: 'component',
  nodes,
  dependencies,
});

describe('searchWorkspaceNodes', () => {
  const systems = [
    {
      path: 'current.yaml',
      name: 'Current',
      schema: baseSchema('Current Diagram', [
        { entityRef: 'ws/current-z', name: 'Zebra Service', type: 'microservice' },
        { entityRef: 'ws/current-a', name: 'Alpha API', type: 'rest-api' },
      ]),
    },
    {
      path: 'other.yaml',
      name: 'Other',
      schema: baseSchema('Other Diagram', [
        { entityRef: 'ws/other-b', name: 'Beta Worker', type: 'background-worker' },
        { entityRef: 'ws/shared', name: 'Shared Cache', type: 'cache-store' },
      ]),
    },
    {
      path: 'shared.yaml',
      name: 'Shared Owner',
      schema: baseSchema('Shared Owner Diagram', [
        { entityRef: 'ws/shared', name: 'Shared Cache Copy', type: 'cache-store' },
      ]),
    },
  ];

  const defaultOptions = {
    showTests: true,
    showUpstreamExternals: true,
    showDownstreamExternals: true,
  };

  it('returns empty results for blank queries', () => {
    expect(searchWorkspaceNodes(systems, 'current.yaml', '   ', defaultOptions)).toEqual([]);
  });

  it('lists current-diagram matches before other diagrams', () => {
    const hits = searchWorkspaceNodes(systems, 'current.yaml', 'a', defaultOptions);

    const firstOtherIndex = hits.findIndex(hit => !hit.isCurrentDiagram);
    const lastCurrentIndex = hits.reduce(
      (index, hit, currentIndex) => (hit.isCurrentDiagram ? currentIndex : index),
      -1
    );

    expect(lastCurrentIndex).toBeGreaterThanOrEqual(0);
    expect(firstOtherIndex).toBeGreaterThan(lastCurrentIndex);
    expect(hits.filter(hit => hit.isCurrentDiagram).map(hit => hit.node.entityRef)).toEqual([
      'ws/current-a',
      'ws/current-z',
    ]);
  });

  it('prefers the current diagram copy when the same entityRef exists elsewhere', () => {
    const hits = searchWorkspaceNodes(systems, 'other.yaml', 'shared', defaultOptions);

    expect(hits).toHaveLength(1);
    expect(hits[0]?.diagramPath).toBe('other.yaml');
    expect(hits[0]?.node.name).toBe('Shared Cache');
  });

  it('respects showTests and directional external filters', () => {
    const filteredSystems = [
      {
        path: 'current.yaml',
        name: 'Current',
        schema: baseSchema(
          'Current Diagram',
          [
            { entityRef: 'ws/core', name: 'Core', type: 'microservice' },
            { entityRef: 'ws/test', name: 'Test Node', type: 'microservice', isTest: true },
            {
              entityRef: 'ws/downstream-ext',
              name: 'Downstream External',
              type: 'microservice',
              external: true,
            },
            {
              entityRef: 'ws/upstream-ext',
              name: 'Upstream External',
              type: 'microservice',
              external: true,
            },
          ],
          [
            { from: 'ws/core', to: 'ws/downstream-ext', type: 'direct-call' },
            { from: 'ws/upstream-ext', to: 'ws/core', type: 'direct-call' },
          ]
        ),
      },
    ];

    expect(
      searchWorkspaceNodes(filteredSystems, 'current.yaml', 'test', {
        showTests: false,
        showUpstreamExternals: true,
        showDownstreamExternals: true,
      }).map(hit => hit.node.entityRef)
    ).toEqual([]);

    expect(
      searchWorkspaceNodes(filteredSystems, 'current.yaml', 'external', {
        showTests: true,
        showUpstreamExternals: true,
        showDownstreamExternals: false,
      }).map(hit => hit.node.entityRef)
    ).toEqual(['ws/upstream-ext']);

    expect(
      searchWorkspaceNodes(filteredSystems, 'current.yaml', 'external', {
        showTests: true,
        showUpstreamExternals: false,
        showDownstreamExternals: false,
      }).map(hit => hit.node.entityRef)
    ).toEqual([]);
  });
});
