import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import type { SystemSchema } from '@archlens/core';
import type { CollabTransport } from './collabTransport';
import { createYjsCollabSession } from './yjsCollabSessionAdapter';

function createLinkedTransports(): [CollabTransport, CollabTransport] {
  const docs: Array<Y.Doc | null> = [null, null];

  const connect =
    (slot: number): CollabTransport['connect'] =>
    (_roomId, ydoc) => {
      docs[slot] = ydoc;
      const origin = `mem-${slot}`;
      const onUpdate = (update: Uint8Array, updateOrigin: unknown) => {
        if (updateOrigin === origin) return;
        const other = docs[1 - slot];
        if (other) Y.applyUpdate(other, update, origin);
      };
      ydoc.on('update', onUpdate);
      const other = docs[1 - slot];
      if (other) {
        Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(other), origin);
      }
      return () => {
        ydoc.off('update', onUpdate);
        docs[slot] = null;
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

describe('createYjsCollabSession', () => {
  it('hydrates a late joiner from the seeded room', async () => {
    const [transportA, transportB] = createLinkedTransports();
    const sessionA = createYjsCollabSession({ transport: transportA, syncWaitMs: 0 });
    const sessionB = createYjsCollabSession({ transport: transportB, syncWaitMs: 0 });
    const received: SystemSchema[] = [];

    await sessionA.join({ roomId: 'room-1', seedSchema: seed, onSchema: () => {} });
    await sessionB.join({
      roomId: 'room-1',
      seedSchema: {
        name: 'Other',
        version: '1.0.0',
        level: 'container',
        nodes: [],
        dependencies: [],
      },
      onSchema: schema => received.push(schema),
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

    await sessionA.join({ roomId: 'room-2', seedSchema: seed, onSchema: () => {} });
    await sessionB.join({
      roomId: 'room-2',
      seedSchema: seed,
      onSchema: schema => received.push(schema),
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
});
