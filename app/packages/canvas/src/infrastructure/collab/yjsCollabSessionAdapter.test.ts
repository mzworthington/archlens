import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import type { SystemSchema } from '@archlens/core';
import type { CollabPresence } from '../../core';
import type { CollabTransport } from './collabTransport';
import { createYjsCollabSession } from './yjsCollabSessionAdapter';

function createLinkedTransports(): [CollabTransport, CollabTransport] {
  const docs: Array<Y.Doc | null> = [null, null];
  const awarenesses: Array<Awareness | null> = [null, null];

  const connect =
    (slot: number): CollabTransport['connect'] =>
    (_roomId, ydoc, awareness) => {
      docs[slot] = ydoc;
      awarenesses[slot] = awareness ?? null;
      const origin = `mem-${slot}`;
      const onUpdate = (update: Uint8Array, updateOrigin: unknown) => {
        if (updateOrigin === origin) return;
        const other = docs[1 - slot];
        if (other) Y.applyUpdate(other, update, origin);
      };
      ydoc.on('update', onUpdate);

      const onAwarenessUpdate = (
        changes: { added: number[]; updated: number[]; removed: number[] },
        updateOrigin: unknown
      ) => {
        if (updateOrigin === origin) return;
        const local = awarenesses[slot];
        const other = awarenesses[1 - slot];
        if (!local || !other) return;
        const changed = [...changes.added, ...changes.updated, ...changes.removed];
        if (changed.length === 0) return;
        applyAwarenessUpdate(other, encodeAwarenessUpdate(local, changed), `mem-${1 - slot}`);
      };
      awareness?.on('update', onAwarenessUpdate);

      const other = docs[1 - slot];
      if (other) {
        Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(other), origin);
      }
      const otherAwareness = awarenesses[1 - slot];
      if (awareness && otherAwareness) {
        const remoteClients = Array.from(otherAwareness.getStates().keys());
        if (remoteClients.length > 0) {
          applyAwarenessUpdate(
            awareness,
            encodeAwarenessUpdate(otherAwareness, remoteClients),
            origin
          );
        }
        const localClients = Array.from(awareness.getStates().keys());
        if (localClients.length > 0) {
          applyAwarenessUpdate(
            otherAwareness,
            encodeAwarenessUpdate(awareness, localClients),
            `mem-${1 - slot}`
          );
        }
      }

      return {
        dispose: () => {
          ydoc.off('update', onUpdate);
          awareness?.off('update', onAwarenessUpdate);
          docs[slot] = null;
          awarenesses[slot] = null;
        },
        sendControl: () => {},
      };
    };

  return [{ connect: connect(0) }, { connect: connect(1) }];
}

const seed: SystemSchema = {
  name: 'Shop',
  version: '1.0.0',
  level: 'container',
  nodes: [{ entityRef: 'shop/api', type: 'rest-api', name: 'API' }],
  dependencies: [],
};

const emptySeed: SystemSchema = {
  name: 'Other',
  version: '1.0.0',
  level: 'container',
  nodes: [],
  dependencies: [],
};

describe('createYjsCollabSession', () => {
  it('hydrates a late joiner from the seeded room', async () => {
    const [transportA, transportB] = createLinkedTransports();
    const sessionA = createYjsCollabSession({ transport: transportA, syncWaitMs: 0 });
    const sessionB = createYjsCollabSession({ transport: transportB, syncWaitMs: 0 });
    const received: SystemSchema[] = [];

    await sessionA.join({
      roomId: 'room-1',
      seedSchema: seed,
      displayName: 'Ada',
      onSchema: () => {},
      onPresence: () => {},
    });
    await sessionB.join({
      roomId: 'room-1',
      seedSchema: emptySeed,
      displayName: 'Grace',
      onSchema: schema => received.push(schema),
      onPresence: () => {},
    });

    expect(sessionB.isActive()).toBe(true);
    expect(received.at(-1)?.nodes.map(n => n.entityRef)).toEqual(['shop/api']);
    sessionA.leave();
    sessionB.leave();
  });

  it('pushes a local node add to the other session', async () => {
    const [transportA, transportB] = createLinkedTransports();
    const sessionA = createYjsCollabSession({ transport: transportA, syncWaitMs: 0 });
    const sessionB = createYjsCollabSession({ transport: transportB, syncWaitMs: 0 });
    const received: SystemSchema[] = [];

    await sessionA.join({
      roomId: 'room-2',
      seedSchema: seed,
      displayName: 'Ada',
      onSchema: () => {},
      onPresence: () => {},
    });
    await sessionB.join({
      roomId: 'room-2',
      seedSchema: seed,
      displayName: 'Grace',
      onSchema: schema => received.push(schema),
      onPresence: () => {},
    });

    sessionA.pushSchema({
      ...seed,
      nodes: [...seed.nodes, { entityRef: 'shop/web', type: 'web-app', name: 'Web' }],
    });

    expect(
      received
        .at(-1)
        ?.nodes.map(n => n.entityRef)
        .sort()
    ).toEqual(['shop/api', 'shop/web']);
    sessionA.leave();
    sessionB.leave();
  });

  it('broadcasts named cursors and connected count to the other session', async () => {
    const [transportA, transportB] = createLinkedTransports();
    const sessionA = createYjsCollabSession({ transport: transportA, syncWaitMs: 0 });
    const sessionB = createYjsCollabSession({ transport: transportB, syncWaitMs: 0 });
    const presenceA: CollabPresence[] = [];
    const presenceB: CollabPresence[] = [];

    await sessionA.join({
      roomId: 'room-3',
      seedSchema: seed,
      displayName: 'Ada',
      onSchema: () => {},
      onPresence: presence => presenceA.push(presence),
    });
    await sessionB.join({
      roomId: 'room-3',
      seedSchema: seed,
      displayName: 'Grace',
      onSchema: () => {},
      onPresence: presence => presenceB.push(presence),
    });

    sessionA.setCursor({ x: 42, y: 84 });

    const latestA = presenceA.at(-1);
    const latestB = presenceB.at(-1);
    expect(latestA?.connectedCount).toBe(2);
    expect(latestB?.connectedCount).toBe(2);
    expect(latestB?.cursors).toEqual([expect.objectContaining({ name: 'Ada', x: 42, y: 84 })]);
    expect(latestA?.cursors.some(cursor => cursor.name === 'Ada')).toBe(false);

    sessionA.setDisplayName('Ada Lovelace');
    expect(presenceB.at(-1)?.cursors.some(cursor => cursor.name === 'Ada Lovelace')).toBe(true);
    expect(presenceB.at(-1)?.participants.some(p => p.name === 'Ada Lovelace' && !p.isLocal)).toBe(
      true
    );

    sessionA.leave();
    sessionB.leave();
  });

  it('does not join without a display name', async () => {
    const [transportA] = createLinkedTransports();
    const sessionA = createYjsCollabSession({ transport: transportA, syncWaitMs: 0 });

    await sessionA.join({
      roomId: 'room-4',
      seedSchema: seed,
      displayName: '   ',
      onSchema: () => {},
      onPresence: () => {},
    });

    expect(sessionA.isActive()).toBe(false);
  });
});
