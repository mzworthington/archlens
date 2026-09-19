import { describe, expect, it } from 'vitest';
import type { NodeComment, SystemSchema } from '@archlens/core';
import { noopCollabSession, type CollabPresence, type CollabSessionPort } from '../../../core';
import { useBlueprintStore } from '../store';

const seed: SystemSchema = {
  name: 'Shop',
  version: '1.0.0',
  level: 'container',
  nodes: [{ entityRef: 'shop/api', type: 'rest-api', name: 'API' }],
  dependencies: [],
};

describe('ioState collab comments', () => {
  it('marks the room active after join so the comment thread can render', async () => {
    let onComments: ((comments: NodeComment[]) => void) | undefined;
    const port: CollabSessionPort = {
      ...noopCollabSession,
      isActive: () => true,
      join: async args => {
        onComments = args.onComments;
        args.onPresence({
          connectedCount: 1,
          cursors: [],
          participants: [{ clientId: 7, name: 'Ada', color: '#38bdf8', isLocal: true }],
        } satisfies CollabPresence);
      },
    };

    useBlueprintStore.setState({
      schema: seed,
      collabSessionPort: port,
      collabRoomActive: false,
      applyRemoteCollabSchema: () => {},
    });

    await useBlueprintStore.getState().joinCollabRoom('room-1', 'Ada');
    expect(useBlueprintStore.getState().collabRoomActive).toBe(true);

    onComments?.([
      {
        id: 'c1',
        nodeEntityRef: 'shop/api',
        authorName: 'Ada',
        authorClientId: 7,
        body: 'needs a gateway',
        createdAtMs: 1,
        status: 'open',
      },
    ]);
    expect(useBlueprintStore.getState().collabComments.map(c => c.body)).toEqual([
      'needs a gateway',
    ]);

    useBlueprintStore.getState().leaveCollabRoom();
    expect(useBlueprintStore.getState().collabRoomActive).toBe(false);
    expect(useBlueprintStore.getState().collabComments).toEqual([]);
  });
});
