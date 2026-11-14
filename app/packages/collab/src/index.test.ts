import { describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { COLLAB_MSG_UPDATE, encodeCollabFrame } from './frames';
import { CollabRoom, MAX_AUTH_FAILURES, YDOC_CHUNK_BYTES, type Env } from './index';

class FakeStorage {
  readonly data = new Map<string, unknown>();

  async get<T = unknown>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T | undefined;
  }

  async put(keyOrEntries: string | Record<string, unknown>, value?: unknown): Promise<void> {
    if (typeof keyOrEntries === 'string') {
      if (value instanceof ArrayBuffer && value.byteLength > 128 * 1024) {
        throw new RangeError('Value exceeds 128 KiB Durable Object KV limit');
      }
      this.data.set(keyOrEntries, value);
      return;
    }
    for (const [k, v] of Object.entries(keyOrEntries)) {
      if (v instanceof ArrayBuffer && v.byteLength > 128 * 1024) {
        throw new RangeError(`Key ${k} exceeds 128 KiB Durable Object KV limit`);
      }
      this.data.set(k, v);
    }
  }

  async delete(keyOrKeys: string | string[]): Promise<boolean> {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    for (const k of keys) {
      this.data.delete(k);
    }
    return true;
  }

  async setAlarm(): Promise<void> {}
  async deleteAlarm(): Promise<void> {}
}

function createFakeSocket() {
  let attachment: unknown = null;
  const sent: Array<string | ArrayBuffer | Uint8Array> = [];
  const close = vi.fn();
  const ws = {
    send: (msg: string | ArrayBuffer | Uint8Array) => {
      sent.push(msg);
    },
    close,
    serializeAttachment: (value: unknown) => {
      attachment = value;
    },
    deserializeAttachment: () => attachment,
  } as unknown as WebSocket;
  return { ws, sent, close };
}

function createHarness() {
  const storage = new FakeStorage();
  const sockets: WebSocket[] = [];
  const state = {
    storage,
    getWebSockets: () => sockets,
    acceptWebSocket: (ws: WebSocket) => {
      sockets.push(ws);
    },
  } as unknown as DurableObjectState;
  const env = {} as Env;
  return {
    storage,
    sockets,
    state,
    createRoom: () => new CollabRoom(state, env),
  };
}

describe('CollabRoom', () => {
  it('chunks Y.Doc updates exceeding 128 KiB across multiple KV keys and reloads cleanly', async () => {
    const harness = createHarness();
    const room1 = harness.createRoom();
    const host = createFakeSocket();
    harness.sockets.push(host.ws);

    await room1.webSocketMessage(
      host.ws,
      JSON.stringify({
        v: 1,
        op: 'claim',
        hostToken: 'host-token-123456',
        access: 'open',
      })
    );

    const largeDoc = new Y.Doc();
    largeDoc.getText('diagram').insert(0, 'x'.repeat(YDOC_CHUNK_BYTES * 3));
    const update = Y.encodeStateAsUpdate(largeDoc);
    expect(update.byteLength).toBeGreaterThan(128 * 1024);

    const frame = encodeCollabFrame(COLLAB_MSG_UPDATE, update);
    await room1.webSocketMessage(host.ws, frame.slice().buffer);

    expect(harness.storage.data.get('ydoc:chunks')).toBeGreaterThanOrEqual(3);
    expect(harness.storage.data.has('ydoc')).toBe(false);

    // Reload in a fresh CollabRoom instance sharing the same storage
    const room2 = harness.createRoom();
    const guest = createFakeSocket();
    harness.sockets.push(guest.ws);

    await room2.webSocketMessage(guest.ws, JSON.stringify({ v: 1, op: 'join' }));
    expect(guest.sent.length).toBeGreaterThanOrEqual(2);
  });

  it('ignores malformed binary Yjs update frames without crashing the room', async () => {
    const harness = createHarness();
    const room = harness.createRoom();
    const host = createFakeSocket();
    harness.sockets.push(host.ws);

    await room.webSocketMessage(
      host.ws,
      JSON.stringify({
        v: 1,
        op: 'claim',
        hostToken: 'host-token-123456',
        access: 'open',
      })
    );

    const malformed = new Uint8Array([COLLAB_MSG_UPDATE, 255, 255, 255, 128, 99]);
    await expect(room.webSocketMessage(host.ws, malformed.slice().buffer)).resolves.toBeUndefined();
  });

  it('purges stored ydoc chunks when the host ends the room', async () => {
    const harness = createHarness();
    const room = harness.createRoom();
    const host = createFakeSocket();
    harness.sockets.push(host.ws);

    await room.webSocketMessage(
      host.ws,
      JSON.stringify({
        v: 1,
        op: 'claim',
        hostToken: 'host-token-123456',
        access: 'open',
      })
    );

    const doc = new Y.Doc();
    doc.getText('diagram').insert(0, 'hello');
    const frame = encodeCollabFrame(COLLAB_MSG_UPDATE, Y.encodeStateAsUpdate(doc));
    await room.webSocketMessage(host.ws, frame.slice().buffer);
    expect(harness.storage.data.get('ydoc:chunks')).toBe(1);

    await room.webSocketMessage(
      host.ws,
      JSON.stringify({
        v: 1,
        op: 'end',
        hostToken: 'host-token-123456',
      })
    );

    expect(harness.storage.data.has('ydoc:chunks')).toBe(false);
    expect(harness.storage.data.has('ydoc:0')).toBe(false);
  });

  it('closes the socket after repeated failed secret attempts', async () => {
    const harness = createHarness();
    const room = harness.createRoom();
    const host = createFakeSocket();
    const attacker = createFakeSocket();
    harness.sockets.push(host.ws, attacker.ws);

    await room.webSocketMessage(
      host.ws,
      JSON.stringify({
        v: 1,
        op: 'claim',
        hostToken: 'host-token-123456',
        access: 'secret',
        secret: 'correct-horse-battery',
      })
    );

    for (let i = 0; i < MAX_AUTH_FAILURES; i++) {
      await room.webSocketMessage(
        attacker.ws,
        JSON.stringify({
          v: 1,
          op: 'join',
          secret: `wrong-attempt-${i}`,
        })
      );
    }

    expect(attacker.close).toHaveBeenCalledWith(1008, 'denied');
  });
});
