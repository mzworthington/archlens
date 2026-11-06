import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import { mergeLoadedSystemsWithRoom } from './mergeCollabWorkspaceSystems';

function schema(name: string, entityRef: string): SystemSchema {
  return {
    name,
    version: '1.0.0',
    level: 'container',
    nodes: [{ entityRef, type: 'rest-api', name }],
    dependencies: [],
  };
}

describe('mergeLoadedSystemsWithRoom', () => {
  it('adds a sibling from the room without replacing the open file', () => {
    const localContext = schema('Context', 'shop');
    const roomContext = schema('Context', 'shop/remote');
    const containers = schema('Containers', 'shop/api');

    const merged = mergeLoadedSystemsWithRoom(
      [{ path: 'context.yaml', name: 'Context', schema: localContext }],
      [
        { path: 'context.yaml', schema: roomContext },
        { path: 'containers.yaml', schema: containers },
      ],
      'context.yaml'
    );

    expect(merged.find(system => system.path === 'context.yaml')?.schema.nodes[0]?.entityRef).toBe(
      'shop'
    );
    expect(merged.find(system => system.path === 'containers.yaml')?.schema.name).toBe(
      'Containers'
    );
  });

  it('keeps the joiner file when that path is absent from the room', () => {
    const notes = schema('Notes', 'notes');
    const containers = schema('Containers', 'shop/api');

    const merged = mergeLoadedSystemsWithRoom(
      [{ path: 'notes.yaml', name: 'Notes', schema: notes }],
      [{ path: 'containers.yaml', schema: containers }],
      'notes.yaml'
    );

    expect(merged.map(system => system.path).sort()).toEqual(['containers.yaml', 'notes.yaml']);
  });
});
