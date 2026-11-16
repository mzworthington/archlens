import { describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import {
  commentsFromRecord,
  diffCollabDocuments,
  emptyCollabDocument,
  schemaToCollabDocument,
  type NodeComment,
  type SystemSchema,
} from '@archlens/core';
import type { CollabPresence } from '../../core';
import type { CollabTransport } from './collabTransport';
import { createYjsCollabSession } from './yjsCollabSessionAdapter';
import { YJS_COMMENTS_MAP } from './yjsCommentProjection';
import { applyCollabPatch } from './yjsSchemaProjection';

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

const loadingSeed: SystemSchema = {
  name: 'Loading',
  version: '1.0.0',
  level: 'context',
  nodes: [],
  dependencies: [],
};

async function joinCommentRoom(
  sessionA: ReturnType<typeof createYjsCollabSession>,
  sessionB: ReturnType<typeof createYjsCollabSession>,
  roomId: string
): Promise<NodeComment[][]> {
  const commentsB: NodeComment[][] = [];
  await sessionA.join({
    roomId,
    seedSchema: seed,
    displayName: 'Ada',
    onSchema: () => {},
    onPresence: () => {},
  });
  await sessionB.join({
    roomId,
    seedSchema: seed,
    displayName: 'Grace',
    onSchema: () => {},
    onPresence: () => {},
    onComments: next => commentsB.push(next),
  });
  return commentsB;
}

describe('createYjsCollabSession', () => {
  it('does not write a boot Loading schema into the room', async () => {
    const [transportA, transportB] = createLinkedTransports();
    const guest = createYjsCollabSession({ transport: transportA, syncWaitMs: 0 });
    const observer = createYjsCollabSession({ transport: transportB, syncWaitMs: 0 });
    const seen: SystemSchema[] = [];

    await guest.join({
      roomId: 'room-loading',
      seedSchema: loadingSeed,
      displayName: 'Grace',
      onSchema: schema => seen.push(schema),
      onPresence: () => {},
    });
    await observer.join({
      roomId: 'room-loading',
      seedSchema: loadingSeed,
      displayName: 'Ada',
      onSchema: schema => seen.push(schema),
      onPresence: () => {},
    });

    expect(seen).toEqual([]);
    guest.leave();
    observer.leave();
  });

  it('replaces a Loading placeholder with the host diagram instead of adopting it', async () => {
    const [transportA, transportB] = createLinkedTransports();
    const guest = createYjsCollabSession({ transport: transportA, syncWaitMs: 0 });
    const host = createYjsCollabSession({ transport: transportB, syncWaitMs: 0 });
    const guestSeen: SystemSchema[] = [];
    const hostSeen: SystemSchema[] = [];

    await guest.join({
      roomId: 'room-placeholder',
      seedSchema: loadingSeed,
      displayName: 'Grace',
      onSchema: schema => guestSeen.push(schema),
      onPresence: () => {},
    });
    guest.pushSchema(loadingSeed);
    await host.join({
      roomId: 'room-placeholder',
      seedSchema: seed,
      displayName: 'Ada',
      onSchema: schema => hostSeen.push(schema),
      onPresence: () => {},
    });

    expect(hostSeen.map(schema => schema.name)).not.toContain('Loading');
    expect(guestSeen.at(-1)?.name).toBe('Shop');
    expect(guestSeen.at(-1)?.nodes.map(node => node.entityRef)).toEqual(['shop/api']);
    guest.leave();
    host.leave();
  });

  it('replaces a Loading file in a folder room with the host diagram', async () => {
    const [transportA, transportB] = createLinkedTransports();
    const guest = createYjsCollabSession({ transport: transportA, syncWaitMs: 0 });
    const host = createYjsCollabSession({ transport: transportB, syncWaitMs: 0 });
    const guestNodes: string[][] = [];
    const context = {
      ...seed,
      name: 'Context',
      level: 'context' as const,
      nodes: [{ entityRef: 'shop', type: 'software-system' as const, name: 'Shop' }],
    };
    const containers = {
      ...seed,
      name: 'Containers',
      nodes: [{ entityRef: 'shop/api', type: 'rest-api' as const, name: 'API' }],
    };

    await guest.join({
      roomId: 'room-folder-placeholder',
      seedSchema: context,
      seedDiagrams: [
        { path: 'context.yaml', schema: context },
        { path: 'containers.yaml', schema: containers },
      ],
      activePath: 'context.yaml',
      displayName: 'Grace',
      onSchema: () => {},
      onPresence: () => {},
      onDiagram: (_path, schema) => {
        guestNodes.push(schema.nodes.map(node => node.entityRef));
      },
    });
    guest.pushSchema(loadingSeed);
    guestNodes.length = 0;
    await host.join({
      roomId: 'room-folder-placeholder',
      seedSchema: context,
      seedDiagrams: [
        { path: 'context.yaml', schema: context },
        { path: 'containers.yaml', schema: containers },
      ],
      activePath: 'context.yaml',
      displayName: 'Ada',
      onSchema: () => {},
      onPresence: () => {},
    });

    expect(guestNodes.at(-1)).toEqual(['shop']);
    guest.leave();
    host.leave();
  });

  it('waits long enough for a remote snapshot before seeding an empty room', async () => {
    vi.useFakeTimers();
    try {
      const session = createYjsCollabSession({
        transport: {
          connect: () => ({ dispose: () => {}, sendControl: () => {} }),
        },
        controlWaitMs: 0,
      });
      let settled = false;
      const pending = session
        .join({
          roomId: 'room-wait',
          seedSchema: seed,
          displayName: 'Ada',
          onSchema: () => {},
          onPresence: () => {},
        })
        .then(() => {
          settled = true;
        });

      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(399);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await pending;
      expect(settled).toBe(true);
      session.leave();
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops the sync wait when a remote diagram arrives', async () => {
    vi.useFakeTimers();
    let pending: Promise<void> = Promise.resolve();
    let session: ReturnType<typeof createYjsCollabSession> | null = null;
    try {
      const seen: SystemSchema[] = [];
      session = createYjsCollabSession({
        transport: {
          connect: (_roomId, ydoc) => {
            setTimeout(() => {
              applyCollabPatch(
                ydoc,
                diffCollabDocuments(emptyCollabDocument(), schemaToCollabDocument(seed)),
                'remote'
              );
            }, 30);
            return { dispose: () => {}, sendControl: () => {} };
          },
        },
        controlWaitMs: 0,
      });
      let settled = false;
      pending = session
        .join({
          roomId: 'room-early',
          seedSchema: loadingSeed,
          displayName: 'Grace',
          onSchema: schema => seen.push(schema),
          onPresence: () => {},
        })
        .then(() => {
          settled = true;
        });

      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(30);
      expect(settled).toBe(true);
      expect(seen.at(-1)?.name).toBe('Shop');
      expect(seen.at(-1)?.nodes.map(node => node.entityRef)).toEqual(['shop/api']);
    } finally {
      await vi.advanceTimersByTimeAsync(5_000);
      await pending;
      session?.leave();
      vi.useRealTimers();
    }
  });

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

  it('does not seed the diagram when the Worker never admits the socket', async () => {
    const silent: CollabTransport = {
      connect: () => ({
        dispose: () => {},
        sendControl: () => {},
      }),
    };
    const received: SystemSchema[] = [];
    const session = createYjsCollabSession({
      transport: silent,
      syncWaitMs: 0,
      controlWaitMs: 5,
    });

    await session.join({
      roomId: 'room-timeout',
      seedSchema: seed,
      displayName: 'Ada',
      onSchema: schema => received.push(schema),
      onPresence: () => {},
    });

    expect(session.isActive()).toBe(false);
    expect(received).toEqual([]);
  });

  it('broadcasts a node comment to the other session without changing the schema', async () => {
    const [transportA, transportB] = createLinkedTransports();
    const sessionA = createYjsCollabSession({ transport: transportA, syncWaitMs: 0 });
    const sessionB = createYjsCollabSession({ transport: transportB, syncWaitMs: 0 });
    const commentsB: NodeComment[][] = [];
    const schemasB: SystemSchema[] = [];

    await sessionA.join({
      roomId: 'room-comments',
      seedSchema: seed,
      displayName: 'Ada',
      onSchema: () => {},
      onPresence: () => {},
    });
    await sessionB.join({
      roomId: 'room-comments',
      seedSchema: seed,
      displayName: 'Grace',
      onSchema: schema => schemasB.push(schema),
      onPresence: () => {},
      onComments: next => commentsB.push(next),
    });

    sessionA.addComment({ nodeEntityRef: 'shop/api', body: 'needs a gateway' });

    const latest = commentsB.at(-1) ?? [];
    expect(latest).toEqual([
      expect.objectContaining({
        nodeEntityRef: 'shop/api',
        authorName: 'Ada',
        body: 'needs a gateway',
        status: 'open',
      }),
    ]);
    expect(schemasB.at(-1)?.nodes.map(n => n.entityRef)).toEqual(['shop/api']);
    expect(JSON.stringify(schemasB.at(-1))).not.toContain('needs a gateway');

    sessionA.leave();
    sessionB.leave();
  });

  it('does not rematerialize the schema when only a comment changes', async () => {
    const [transportA, transportB] = createLinkedTransports();
    const sessionA = createYjsCollabSession({ transport: transportA, syncWaitMs: 0 });
    const sessionB = createYjsCollabSession({ transport: transportB, syncWaitMs: 0 });
    const schemasB: SystemSchema[] = [];

    await sessionA.join({
      roomId: 'room-comment-schema',
      seedSchema: seed,
      displayName: 'Ada',
      onSchema: () => {},
      onPresence: () => {},
    });
    await sessionB.join({
      roomId: 'room-comment-schema',
      seedSchema: seed,
      displayName: 'Grace',
      onSchema: schema => schemasB.push(schema),
      onPresence: () => {},
    });

    const before = schemasB.length;
    sessionA.addComment({ nodeEntityRef: 'shop/api', body: 'needs a gateway' });

    expect(schemasB).toHaveLength(before);

    sessionA.leave();
    sessionB.leave();
  });

  it('clears an open comment for peers after resolve or delete', async () => {
    const [transportA, transportB] = createLinkedTransports();
    const sessionA = createYjsCollabSession({ transport: transportA, syncWaitMs: 0 });
    const sessionB = createYjsCollabSession({ transport: transportB, syncWaitMs: 0 });
    const commentsB = await joinCommentRoom(sessionA, sessionB, 'room-resolve');

    sessionA.addComment({ nodeEntityRef: 'shop/api', body: 'first' });
    sessionA.addComment({ nodeEntityRef: 'shop/api', body: 'second' });
    const posted = commentsB.at(-1) ?? [];
    const first = posted.find(comment => comment.body === 'first');
    const second = posted.find(comment => comment.body === 'second');
    expect(first && second).toBeTruthy();

    sessionA.resolveComment(first!.id);
    expect((commentsB.at(-1) ?? []).filter(c => c.status === 'open').map(c => c.body)).toEqual([
      'second',
    ]);

    sessionA.deleteComment(second!.id);
    expect((commentsB.at(-1) ?? []).filter(c => c.status === 'open')).toEqual([]);

    sessionA.leave();
    sessionB.leave();
  });

  it('seeds sidecar comments into the room without overwriting an existing id', async () => {
    const sidecar: NodeComment = {
      id: 'side-1',
      nodeEntityRef: 'shop/api',
      authorName: 'Ada',
      authorClientId: 0,
      authorKey: 'ada-stable',
      body: 'from disk',
      createdAtMs: 10,
      status: 'open',
    };
    const [transportA, transportB] = createLinkedTransports();
    const sessionA = createYjsCollabSession({ transport: transportA, syncWaitMs: 0 });
    const sessionB = createYjsCollabSession({ transport: transportB, syncWaitMs: 0 });
    const commentsB: NodeComment[][] = [];

    await sessionA.join({
      roomId: 'room-seed',
      seedSchema: seed,
      displayName: 'Ada',
      seedComments: [sidecar],
      onSchema: () => {},
      onPresence: () => {},
    });
    await sessionB.join({
      roomId: 'room-seed',
      seedSchema: seed,
      displayName: 'Grace',
      seedComments: [
        { ...sidecar, body: 'stale duplicate' },
        {
          ...sidecar,
          id: 'side-2',
          authorName: 'Grace',
          authorKey: 'grace-stable',
          body: 'grace disk',
        },
      ],
      onSchema: () => {},
      onPresence: () => {},
      onComments: next => commentsB.push(next),
    });

    expect((commentsB.at(-1) ?? []).map(comment => comment.body).sort()).toEqual([
      'from disk',
      'grace disk',
    ]);

    sessionA.leave();
    sessionB.leave();
  });

  it('lets the same author resolve a comment after the Yjs client id changes', async () => {
    const [transportA, transportB] = createLinkedTransports();
    const authorKeyStore = {
      current: 'ada-stable',
      get() {
        return this.current;
      },
      set(value: string) {
        this.current = value;
      },
    };
    const sessionA = createYjsCollabSession({
      transport: transportA,
      syncWaitMs: 0,
      authorKeyStore,
    });
    const sessionB = createYjsCollabSession({ transport: transportB, syncWaitMs: 0 });
    const commentsB = await joinCommentRoom(sessionA, sessionB, 'room-rejoin');

    sessionA.addComment({ nodeEntityRef: 'shop/api', body: 'keep me' });
    const posted = (commentsB.at(-1) ?? []).find(comment => comment.body === 'keep me');
    expect(posted).toBeTruthy();

    sessionB.resolveComment(posted!.id);
    expect((commentsB.at(-1) ?? []).some(comment => comment.status === 'open')).toBe(true);

    sessionA.leave();
    const rejoined = createYjsCollabSession({
      transport: transportA,
      syncWaitMs: 0,
      authorKeyStore,
    });
    await rejoined.join({
      roomId: 'room-rejoin',
      seedSchema: seed,
      displayName: 'Ada',
      onSchema: () => {},
      onPresence: () => {},
    });

    rejoined.resolveComment(posted!.id);
    expect((commentsB.at(-1) ?? []).filter(comment => comment.status === 'open')).toEqual([]);

    rejoined.leave();
    sessionB.leave();
  });

  it('publishes the stable author key on local presence', async () => {
    const [transportA] = createLinkedTransports();
    const authorKeyStore = {
      current: 'ada-stable',
      get() {
        return this.current;
      },
      set(value: string) {
        this.current = value;
      },
    };
    const session = createYjsCollabSession({
      transport: transportA,
      syncWaitMs: 0,
      authorKeyStore,
    });
    const presence: CollabPresence[] = [];

    await session.join({
      roomId: 'room-author-key',
      seedSchema: seed,
      displayName: 'Ada',
      onSchema: () => {},
      onPresence: next => presence.push(next),
    });

    expect(presence.at(-1)?.participants.find(participant => participant.isLocal)?.authorKey).toBe(
      'ada-stable'
    );

    session.leave();
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

  it('keeps a folder share in one room and scopes edits to the open diagram', async () => {
    const [transportA, transportB] = createLinkedTransports();
    const sessionA = createYjsCollabSession({ transport: transportA, syncWaitMs: 0 });
    const sessionB = createYjsCollabSession({ transport: transportB, syncWaitMs: 0 });
    const diagramsB: string[][] = [];
    const nodesB: Array<Record<string, string[]>> = [];
    const openedB: string[] = [];
    const presenceB: CollabPresence[] = [];

    const context = {
      ...seed,
      name: 'Context',
      nodes: [{ entityRef: 'shop', type: 'software-system' as const, name: 'Shop' }],
    };
    const containers = {
      ...seed,
      name: 'Containers',
      level: 'container' as const,
      nodes: [{ entityRef: 'shop/api', type: 'rest-api' as const, name: 'API' }],
    };

    await sessionA.join({
      roomId: 'room-workspace',
      seedSchema: context,
      seedDiagrams: [
        { path: 'context.yaml', schema: context },
        { path: 'containers.yaml', schema: containers },
      ],
      activePath: 'context.yaml',
      displayName: 'Ada',
      onSchema: () => {},
      onPresence: () => {},
    });
    await sessionB.join({
      roomId: 'room-workspace',
      seedSchema: context,
      seedDiagrams: [{ path: 'context.yaml', schema: context }],
      activePath: 'context.yaml',
      displayName: 'Grace',
      onSchema: () => {},
      onDiagram: path => openedB.push(path),
      onWorkspace: update => {
        diagramsB.push(update.diagrams.map(diagram => diagram.path));
        const nodes: Record<string, string[]> = {};
        for (const diagram of update.diagrams) {
          nodes[diagram.path] = diagram.schema.nodes.map(node => node.entityRef);
        }
        nodesB.push(nodes);
      },
      onPresence: presence => presenceB.push(presence),
    });

    expect(sessionA.roomId()).toBe('room-workspace');
    expect(diagramsB.at(-1)?.slice().sort()).toEqual(['containers.yaml', 'context.yaml']);
    expect(openedB.at(-1)).toBe('context.yaml');

    sessionA.pushSchema({
      ...context,
      nodes: [...context.nodes, { entityRef: 'shop/web', type: 'web-app', name: 'Web' }],
    });
    expect(sessionB.focusDiagram('containers.yaml')).toBe(true);
    expect(sessionB.roomId()).toBe(sessionA.roomId());
    expect(sessionB.isActive()).toBe(true);
    expect(openedB.at(-1)).toBe('containers.yaml');

    sessionA.setCursor({ x: 12, y: 24 });
    expect(presenceB.at(-1)?.connectedCount).toBe(2);
    expect(presenceB.at(-1)?.cursors.some(cursor => cursor.name === 'Ada')).toBe(false);

    sessionA.pushSchema({
      ...context,
      nodes: [
        ...context.nodes,
        { entityRef: 'shop/web', type: 'web-app', name: 'Web' },
        { entityRef: 'shop/db', type: 'relational-database', name: 'DB' },
      ],
    });
    expect(openedB.at(-1)).toBe('containers.yaml');
    expect(nodesB.at(-1)?.['containers.yaml']).toEqual(['shop/api']);
    expect(nodesB.at(-1)?.['context.yaml']).toEqual(['shop', 'shop/web', 'shop/db']);

    sessionA.leave();
    sessionB.leave();
  });

  it('keeps comments on the diagram that owns them when the room switches files', async () => {
    const [transportA, transportB] = createLinkedTransports();
    const sessionA = createYjsCollabSession({ transport: transportA, syncWaitMs: 0 });
    const sessionB = createYjsCollabSession({ transport: transportB, syncWaitMs: 0 });
    const commentsA: NodeComment[][] = [];
    const commentsB: NodeComment[][] = [];
    const context = {
      ...seed,
      name: 'Context',
      level: 'context' as const,
      nodes: [{ entityRef: 'shop', type: 'software-system' as const, name: 'Shop' }],
    };
    const containers = {
      ...seed,
      name: 'Containers',
      nodes: [{ entityRef: 'shop/api', type: 'rest-api' as const, name: 'API' }],
    };

    await sessionA.join({
      roomId: 'room-comment-diagrams',
      seedSchema: context,
      seedDiagrams: [
        { path: 'context.yaml', schema: context },
        { path: 'containers.yaml', schema: containers },
      ],
      activePath: 'context.yaml',
      displayName: 'Ada',
      onSchema: () => {},
      onPresence: () => {},
      onComments: next => commentsA.push(next),
    });
    await sessionB.join({
      roomId: 'room-comment-diagrams',
      seedSchema: context,
      seedDiagrams: [
        { path: 'context.yaml', schema: context },
        { path: 'containers.yaml', schema: containers },
      ],
      activePath: 'context.yaml',
      displayName: 'Grace',
      onSchema: () => {},
      onDiagram: () => {},
      onPresence: () => {},
      onComments: next => commentsB.push(next),
    });

    sessionA.addComment({ nodeEntityRef: 'shop', body: 'on context' });
    expect(sessionB.focusDiagram('containers.yaml', containers)).toBe(true);
    sessionB.addComment({ nodeEntityRef: 'shop/api', body: 'on containers' });

    expect((commentsA.at(-1) ?? []).map(comment => comment.body)).toEqual(['on context']);
    expect((commentsB.at(-1) ?? []).map(comment => comment.body)).toEqual(['on containers']);

    sessionA.leave();
    sessionB.leave();
  });

  it('does not seed a comment the room has already deleted', async () => {
    const [transportA, transportB] = createLinkedTransports();
    const sessionA = createYjsCollabSession({ transport: transportA, syncWaitMs: 0 });
    const sessionB = createYjsCollabSession({ transport: transportB, syncWaitMs: 0 });
    const commentsA: NodeComment[][] = [];
    const context = {
      ...seed,
      name: 'Context',
      level: 'context' as const,
      nodes: [{ entityRef: 'shop', type: 'software-system' as const, name: 'Shop' }],
    };

    await sessionA.join({
      roomId: 'room-comment-tombstone',
      seedSchema: context,
      seedDiagrams: [
        { path: 'context.yaml', schema: context },
        { path: 'containers.yaml', schema: { ...seed, name: 'Containers' } },
      ],
      activePath: 'context.yaml',
      displayName: 'Ada',
      onSchema: () => {},
      onPresence: () => {},
      onComments: next => commentsA.push(next),
    });
    await sessionB.join({
      roomId: 'room-comment-tombstone',
      seedSchema: context,
      activePath: 'context.yaml',
      displayName: 'Grace',
      onSchema: () => {},
      onPresence: () => {},
    });

    sessionA.addComment({ nodeEntityRef: 'shop', body: 'deleted in the room' });
    const posted = (commentsA.at(-1) ?? []).find(comment => comment.body === 'deleted in the room');
    expect(posted).toBeTruthy();
    sessionA.deleteComment(posted!.id);
    expect(commentsA.at(-1) ?? []).toEqual([]);

    expect(sessionB.focusDiagram('context.yaml', context)).toBe(true);
    sessionB.seedComments([posted!]);
    expect((commentsA.at(-1) ?? []).map(comment => comment.id)).not.toContain(posted!.id);

    sessionA.leave();
    sessionB.leave();
  });

  it('drops a nested comment when an older client deletes the flat row', async () => {
    const room: { doc: Y.Doc | null } = { doc: null };
    const transport: CollabTransport = {
      connect: (_roomId, ydoc) => {
        room.doc = ydoc;
        return { dispose: () => {}, sendControl: () => {} };
      },
    };
    const session = createYjsCollabSession({ transport, syncWaitMs: 0 });
    const seen: NodeComment[][] = [];
    await session.join({
      roomId: 'room-legacy-delete',
      seedSchema: seed,
      activePath: 'context.yaml',
      displayName: 'Ada',
      onSchema: () => {},
      onPresence: () => {},
      onComments: next => seen.push(next),
    });

    session.addComment({ nodeEntityRef: 'shop/api', body: 'shipped layout' });
    const posted = (seen.at(-1) ?? []).find(row => row.body === 'shipped layout');
    const live = room.doc;
    if (!live || !posted) throw new Error('room comment was not stored');
    live.transact(() => live.getMap(YJS_COMMENTS_MAP).delete(posted.id));

    expect(seen.at(-1) ?? []).toEqual([]);
    session.leave();
  });

  it('shows a nested-only comment to a client that still reads the flat map', async () => {
    const room: { doc: Y.Doc | null } = { doc: null };
    const transport: CollabTransport = {
      connect: (_roomId, ydoc) => {
        room.doc = ydoc;
        return { dispose: () => {}, sendControl: () => {} };
      },
    };
    const session = createYjsCollabSession({ transport, syncWaitMs: 0 });
    const seen: NodeComment[][] = [];
    await session.join({
      roomId: 'room-legacy-nested',
      seedSchema: seed,
      activePath: 'context.yaml',
      displayName: 'Ada',
      onSchema: () => {},
      onPresence: () => {},
      onComments: next => seen.push(next),
    });

    const live = room.doc;
    if (!live) throw new Error('room doc missing');
    live.transact(() => {
      const diagram = new Y.Map<unknown>();
      const row = new Y.Map<unknown>();
      row.set('id', 'c-nested');
      row.set('nodeEntityRef', 'shop/api');
      row.set('authorName', 'Grace');
      row.set('authorClientId', 8);
      row.set('body', 'nested only');
      row.set('createdAtMs', 4);
      row.set('status', 'open');
      diagram.set('c-nested', row);
      live.getMap(YJS_COMMENTS_MAP).set('context.yaml', diagram);
    });

    expect((seen.at(-1) ?? []).map(row => row.body)).toEqual(['nested only']);
    const flat = commentsFromRecord(
      live.getMap(YJS_COMMENTS_MAP).toJSON() as Record<string, unknown>
    );
    expect(flat.map(row => row.body)).toEqual(['nested only']);
    session.leave();
  });
});
