import { describe, expect, it, vi } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import { noopCollabSession, type CollabSessionPort } from '../../../core';
import { useBlueprintStore } from '../store';

const context: SystemSchema = {
  name: 'Context',
  version: '1.0.0',
  level: 'context',
  nodes: [{ entityRef: 'shop', type: 'software-system', name: 'Shop' }],
  dependencies: [],
};

const containers: SystemSchema = {
  name: 'Containers',
  version: '1.0.0',
  level: 'container',
  nodes: [{ entityRef: 'shop/api', type: 'rest-api', name: 'API' }],
  dependencies: [],
};

const notes: SystemSchema = {
  name: 'Notes',
  version: '1.0.0',
  level: 'container',
  nodes: [{ entityRef: 'notes', type: 'software-system', name: 'Notes' }],
  dependencies: [],
};

describe('workspace collab room', () => {
  it('shares every open diagram and switches files without leaving the room', async () => {
    const focusDiagram = vi.fn().mockReturnValue(true);
    let seedPaths: string[] = [];
    const port: CollabSessionPort = {
      ...noopCollabSession,
      isActive: () => true,
      roomId: () => 'room-1',
      focusDiagram,
      join: async args => {
        seedPaths = (args.seedDiagrams ?? []).map(diagram => diagram.path);
        args.onPresence({ connectedCount: 1, cursors: [], participants: [] });
      },
    };

    useBlueprintStore.setState({
      currentFilePath: 'context.yaml',
      schema: context,
      loadedSystems: [
        { path: 'context.yaml', name: 'Context', schema: context },
        { path: 'containers.yaml', name: 'Containers', schema: containers },
      ],
      collabRoomActive: true,
      collabSessionPort: port,
    });

    await useBlueprintStore.getState().joinCollabRoom('room-1', 'Ada');
    expect(seedPaths).toEqual(['context.yaml', 'containers.yaml']);

    await useBlueprintStore.getState().selectSystem('containers.yaml');
    expect(focusDiagram).toHaveBeenCalledWith('containers.yaml', containers);
    expect(useBlueprintStore.getState().currentFilePath).toBe('containers.yaml');
    expect(useBlueprintStore.getState().collabSessionPort.roomId()).toBe('room-1');
  });

  it('keeps a joiner file that the room does not have and still lists the sibling', async () => {
    const port: CollabSessionPort = {
      ...noopCollabSession,
      isActive: () => true,
      join: async args => {
        args.onPresence({ connectedCount: 1, cursors: [], participants: [] });
        args.onWorkspace?.({
          activePath: 'notes.yaml',
          diagrams: [
            { path: 'notes.yaml', schema: notes },
            { path: 'containers.yaml', schema: containers },
          ],
        });
      },
    };

    useBlueprintStore.setState({
      currentFilePath: 'notes.yaml',
      schema: notes,
      workspaceName: 'Shop',
      loadedSystems: [{ path: 'notes.yaml', name: 'Notes', schema: notes }],
      collabSessionPort: port,
    });

    await useBlueprintStore.getState().joinCollabRoom('room-1', 'Ada');

    expect(
      useBlueprintStore
        .getState()
        .loadedSystems.map(system => system.path)
        .sort()
    ).toEqual(['containers.yaml', 'notes.yaml']);
    expect(useBlueprintStore.getState().currentFilePath).toBe('notes.yaml');
    expect(useBlueprintStore.getState().schema.nodes[0]?.entityRef).toBe('notes');
  });
});
