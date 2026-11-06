import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import {
  collabWorkspaceFocusPath,
  collabWorkspaceFromSchemas,
  mergeCollabWorkspaceJoin,
  replaceCollabWorkspaceDiagram,
  schemaFromCollabWorkspace,
} from './collabWorkspace';

function schema(name: string, entityRef: string): SystemSchema {
  return {
    name,
    version: '1.0.0',
    level: 'container',
    nodes: [{ entityRef, type: 'rest-api', name }],
    dependencies: [],
  };
}

const context = schema('Context', 'shop');
const containers = schema('Containers', 'shop/api');

describe('collab workspace room', () => {
  it('keeps an edit on diagram A from replacing diagram B', () => {
    const room = collabWorkspaceFromSchemas([
      { path: 'context.yaml', schema: context },
      { path: 'containers.yaml', schema: containers },
    ]);

    const edited = replaceCollabWorkspaceDiagram(room, 'context.yaml', {
      ...context,
      nodes: [...context.nodes, { entityRef: 'shop/web', type: 'web-app', name: 'Web' }],
    });

    expect(
      schemaFromCollabWorkspace(edited, 'context.yaml')?.nodes.map(node => node.entityRef)
    ).toEqual(['shop', 'shop/web']);
    expect(schemaFromCollabWorkspace(edited, 'containers.yaml')).toEqual(
      schemaFromCollabWorkspace(room, 'containers.yaml')
    );
  });

  it('gives a one-file joiner that file and does not drop or require siblings', () => {
    const remote = collabWorkspaceFromSchemas([
      { path: 'context.yaml', schema: context },
      { path: 'containers.yaml', schema: containers },
    ]);

    const merged = mergeCollabWorkspaceJoin(remote, [
      {
        path: 'context.yaml',
        schema: schema('Local only', 'shop/local'),
      },
    ]);

    expect(
      schemaFromCollabWorkspace(merged, 'context.yaml')?.nodes.map(node => node.entityRef)
    ).toEqual(['shop']);
    expect(schemaFromCollabWorkspace(merged, 'containers.yaml')?.name).toBe('Containers');
    expect(schemaFromCollabWorkspace(merged, 'missing.yaml')).toBeNull();
    expect(collabWorkspaceFocusPath(merged, 'context.yaml', ['context.yaml'])).toBe('context.yaml');
  });

  it('stays on the joiner file when the room has never seen it', () => {
    const remote = collabWorkspaceFromSchemas([{ path: 'containers.yaml', schema: containers }]);
    const merged = mergeCollabWorkspaceJoin(remote, [{ path: 'notes.yaml', schema: context }]);

    expect(collabWorkspaceFocusPath(merged, 'notes.yaml', ['notes.yaml'])).toBe('notes.yaml');
    expect(schemaFromCollabWorkspace(merged, 'containers.yaml')?.name).toBe('Containers');
    expect(schemaFromCollabWorkspace(merged, 'notes.yaml')?.name).toBe('Context');
  });

  it('opens the first room diagram when the joiner has no local file', () => {
    const remote = collabWorkspaceFromSchemas([
      { path: 'containers.yaml', schema: containers },
      { path: 'context.yaml', schema: context },
    ]);

    expect(collabWorkspaceFocusPath(remote, 'samples/context.yaml', [])).toBe('containers.yaml');
  });
});
