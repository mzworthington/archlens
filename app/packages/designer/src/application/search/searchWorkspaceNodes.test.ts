import { describe, it, expect } from 'vitest';
import { searchWorkspaceNodes } from './searchWorkspaceNodes';
import type { SystemSchema } from '@blueprint/core';

const baseSchema = (name: string, nodes: SystemSchema['nodes']): SystemSchema => ({
  name,
  version: '1.0.0',
  level: 'component',
  nodes,
  dependencies: [],
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

  it('returns empty results for blank queries', () => {
    expect(
      searchWorkspaceNodes(systems, 'current.yaml', '   ', { showTests: true, showExternals: true })
    ).toEqual([]);
  });

  it('lists current-diagram matches before other diagrams', () => {
    const hits = searchWorkspaceNodes(systems, 'current.yaml', 'a', {
      showTests: true,
      showExternals: true,
    });

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
    const hits = searchWorkspaceNodes(systems, 'other.yaml', 'shared', {
      showTests: true,
      showExternals: true,
    });

    expect(hits).toHaveLength(1);
    expect(hits[0]?.diagramPath).toBe('other.yaml');
    expect(hits[0]?.node.name).toBe('Shared Cache');
  });

  it('respects showTests and showExternals filters', () => {
    const filteredSystems = [
      {
        path: 'current.yaml',
        name: 'Current',
        schema: baseSchema('Current Diagram', [
          { entityRef: 'ws/test', name: 'Test Node', type: 'microservice', isTest: true },
          { entityRef: 'ws/ext', name: 'External Node', type: 'microservice', external: true },
        ]),
      },
    ];

    expect(
      searchWorkspaceNodes(filteredSystems, 'current.yaml', 'node', {
        showTests: false,
        showExternals: true,
      }).map(hit => hit.node.entityRef)
    ).toEqual(['ws/ext']);

    expect(
      searchWorkspaceNodes(filteredSystems, 'current.yaml', 'node', {
        showTests: true,
        showExternals: false,
      }).map(hit => hit.node.entityRef)
    ).toEqual(['ws/test']);
  });
});
