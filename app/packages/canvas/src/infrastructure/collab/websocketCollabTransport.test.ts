import { afterEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import {
  COLLAB_MSG_AWARENESS,
  COLLAB_MSG_AWARENESS_QUERY,
  COLLAB_MSG_SYNC,
  COLLAB_MSG_UPDATE,
  collabFrameToArrayBuffer,
  createWebsocketCollabTransport,
  decodeCollabFrame,
  encodeCollabFrame,
} from './websocketCollabTransport';

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = FakeWebSocket.CONNECTING;
  binaryType = 'arraybuffer';
  readonly sent: ArrayBuffer[] = [];
  private readonly listeners = new Map<string, Set<(event: { data?: unknown }) => void>>();

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  static instances: FakeWebSocket[] = [];

  static reset(): void {
    FakeWebSocket.instances = [];
  }

  addEventListener(type: string, listener: (event: { data?: unknown }) => void): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  send(data: ArrayBuffer): void {
    this.sent.push(data);
  }

  close(): void {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.emit('close');
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.emit('open');
  }

  receive(frame: Uint8Array): void {
    this.emit('message', { data: collabFrameToArrayBuffer(frame) });
  }

  private emit(type: string, event: { data?: unknown } = {}): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

function sentKinds(socket: FakeWebSocket): number[] {
  return socket.sent.map(buf => decodeCollabFrame(buf)?.kind).filter((k): k is number => k != null);
}

describe('collab websocket frames', () => {
  it('round-trips a sync frame', () => {
    const payload = Uint8Array.from([9, 8, 7]);
    const frame = encodeCollabFrame(COLLAB_MSG_SYNC, payload);
    expect(frame[0]).toBe(COLLAB_MSG_SYNC);
    expect(decodeCollabFrame(frame)).toEqual({ kind: COLLAB_MSG_SYNC, update: payload });
  });

  it('round-trips an update frame from ArrayBuffer', () => {
    const payload = Uint8Array.from([1, 2, 3, 4]);
    const frame = encodeCollabFrame(COLLAB_MSG_UPDATE, payload);
    const decoded = decodeCollabFrame(collabFrameToArrayBuffer(frame));
    expect(decoded?.kind).toBe(COLLAB_MSG_UPDATE);
    expect(Array.from(decoded?.update ?? [])).toEqual([1, 2, 3, 4]);
  });
});

describe('createWebsocketCollabTransport reconnect', () => {
  afterEach(() => {
    FakeWebSocket.reset();
    vi.useRealTimers();
  });

  it('opens a new socket after close and re-sends sync plus awareness on reopen', () => {
    vi.useFakeTimers();
    const transport = createWebsocketCollabTransport('wss://collab.test', {
      createWebSocket: url => new FakeWebSocket(url) as unknown as WebSocket,
      reconnectDelaysMs: [100],
    });
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    awareness.setLocalState({ name: 'Ada', color: '#fff', cursor: null });

    const dispose = transport.connect('room-abcd', ydoc, awareness);
    expect(FakeWebSocket.instances).toHaveLength(1);
    const first = FakeWebSocket.instances[0]!;
    first.open();
    expect(sentKinds(first)).toEqual([
      COLLAB_MSG_SYNC,
      COLLAB_MSG_AWARENESS,
      COLLAB_MSG_AWARENESS_QUERY,
    ]);

    first.close();
    vi.advanceTimersByTime(100);

    expect(FakeWebSocket.instances).toHaveLength(2);
    const second = FakeWebSocket.instances[1]!;
    expect(second.url).toBe('wss://collab.test/room/room-abcd');
    second.open();
    expect(sentKinds(second)).toEqual([
      COLLAB_MSG_SYNC,
      COLLAB_MSG_AWARENESS,
      COLLAB_MSG_AWARENESS_QUERY,
    ]);

    dispose();
  });

  it('forwards local doc updates on the reconnected socket', () => {
    vi.useFakeTimers();
    const transport = createWebsocketCollabTransport('wss://collab.test', {
      createWebSocket: url => new FakeWebSocket(url) as unknown as WebSocket,
      reconnectDelaysMs: [50],
    });
    const ydoc = new Y.Doc();
    const dispose = transport.connect('room-efgh', ydoc);

    const first = FakeWebSocket.instances[0]!;
    first.open();
    first.close();
    vi.advanceTimersByTime(50);
    const second = FakeWebSocket.instances[1]!;
    second.open();
    second.sent.length = 0;

    ydoc.getMap('meta').set('name', 'Shop');
    expect(sentKinds(second)).toContain(COLLAB_MSG_UPDATE);

    dispose();
  });

  it('does not reconnect after dispose', () => {
    vi.useFakeTimers();
    const transport = createWebsocketCollabTransport('wss://collab.test', {
      createWebSocket: url => new FakeWebSocket(url) as unknown as WebSocket,
      reconnectDelaysMs: [25],
    });
    const ydoc = new Y.Doc();
    const dispose = transport.connect('room-ijkl', ydoc);
    const first = FakeWebSocket.instances[0]!;
    first.open();
    dispose();
    first.close();
    vi.advanceTimersByTime(100);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('reconnects immediately on an online signal after a dead socket', () => {
    vi.useFakeTimers();
    const signalListeners = new Set<() => void>();
    const transport = createWebsocketCollabTransport('wss://collab.test', {
      createWebSocket: url => new FakeWebSocket(url) as unknown as WebSocket,
      reconnectDelaysMs: [5_000],
      subscribeReconnectSignals: onSignal => {
        signalListeners.add(onSignal);
        return () => signalListeners.delete(onSignal);
      },
    });
    const ydoc = new Y.Doc();
    const dispose = transport.connect('room-mnop', ydoc);
    const first = FakeWebSocket.instances[0]!;
    first.open();
    first.close();

    expect(FakeWebSocket.instances).toHaveLength(1);
    for (const listener of signalListeners) listener();
    expect(FakeWebSocket.instances).toHaveLength(2);

    dispose();
  });

  it('applies remote updates after reconnect using a stable origin', () => {
    vi.useFakeTimers();
    const transport = createWebsocketCollabTransport('wss://collab.test', {
      createWebSocket: url => new FakeWebSocket(url) as unknown as WebSocket,
      reconnectDelaysMs: [10],
    });
    const ydoc = new Y.Doc();
    const dispose = transport.connect('room-qrst', ydoc);
    FakeWebSocket.instances[0]!.open();
    FakeWebSocket.instances[0]!.close();
    vi.advanceTimersByTime(10);
    const second = FakeWebSocket.instances[1]!;
    second.open();

    const remote = new Y.Doc();
    remote.getMap('meta').set('name', 'FromPeer');
    const update = Y.encodeStateAsUpdate(remote);
    second.receive(encodeCollabFrame(COLLAB_MSG_SYNC, update));

    expect(ydoc.getMap('meta').get('name')).toBe('FromPeer');
    dispose();
  });
});
