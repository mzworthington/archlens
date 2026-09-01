import * as Y from 'yjs';
import { applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import type { CollabTransport } from './collabTransport';
import {
  COLLAB_MSG_AWARENESS,
  COLLAB_MSG_AWARENESS_QUERY,
  COLLAB_MSG_SYNC,
  COLLAB_MSG_UPDATE,
  decodeCollabFrame,
  encodeCollabFrame,
} from '@archlens/collab/frames';

export {
  COLLAB_MSG_AWARENESS,
  COLLAB_MSG_AWARENESS_QUERY,
  COLLAB_MSG_SYNC,
  COLLAB_MSG_UPDATE,
  decodeCollabFrame,
  encodeCollabFrame,
};

/** Default backoff between reconnect attempts (mobile network flaps). */
export const DEFAULT_COLLAB_RECONNECT_DELAYS_MS = [500, 1000, 2000, 4000, 8000, 15_000] as const;

export function collabFrameToArrayBuffer(frame: Uint8Array): ArrayBuffer {
  return frame.buffer.slice(frame.byteOffset, frame.byteOffset + frame.byteLength) as ArrayBuffer;
}

function sendFrame(socket: WebSocket, kind: 0 | 1 | 2 | 3, payload: Uint8Array): void {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(collabFrameToArrayBuffer(encodeCollabFrame(kind, payload)));
}

function defaultSubscribeReconnectSignals(onSignal: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onOnline = () => onSignal();
  const onVisible = () => {
    if (document.visibilityState === 'visible') onSignal();
  };
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

export type WebsocketCollabTransportOptions = {
  createWebSocket?: (url: string) => WebSocket;
  /** Backoff schedule for unexpected socket closes. Last delay repeats. */
  reconnectDelaysMs?: readonly number[];
  setTimeoutFn?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeoutFn?: (id: ReturnType<typeof setTimeout>) => void;
  /** Browser online / foreground signals that should reconnect immediately. */
  subscribeReconnectSignals?: (onSignal: () => void) => () => void;
};

export function createWebsocketCollabTransport(
  baseUrl: string,
  options: WebsocketCollabTransportOptions = {}
): CollabTransport {
  const normalized = baseUrl.replace(/\/$/, '');
  const createWebSocket = options.createWebSocket ?? ((url: string) => new WebSocket(url));
  const reconnectDelaysMs = options.reconnectDelaysMs ?? DEFAULT_COLLAB_RECONNECT_DELAYS_MS;
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;
  const subscribeReconnectSignals =
    options.subscribeReconnectSignals ?? defaultSubscribeReconnectSignals;

  return {
    connect(roomId, ydoc, awareness) {
      const url = `${normalized}/room/${encodeURIComponent(roomId)}`;
      const origin = {};
      let socket: WebSocket | null = null;
      let disposed = false;
      let reconnectAttempt = 0;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
      let intentionalClose = false;

      const clearReconnectTimer = () => {
        if (reconnectTimer != null) {
          clearTimeoutFn(reconnectTimer);
          reconnectTimer = null;
        }
      };

      const sendOnCurrent = (kind: 0 | 1 | 2 | 3, payload: Uint8Array) => {
        if (!socket) return;
        sendFrame(socket, kind, payload);
      };

      const onDocUpdate = (update: Uint8Array, updateOrigin: unknown) => {
        if (updateOrigin === origin) return;
        sendOnCurrent(COLLAB_MSG_UPDATE, update);
      };
      ydoc.on('update', onDocUpdate);

      const onAwarenessUpdate = (
        changes: { added: number[]; updated: number[]; removed: number[] },
        updateOrigin: unknown
      ) => {
        if (!awareness || updateOrigin === origin) return;
        const changed = [...changes.added, ...changes.updated, ...changes.removed];
        if (changed.length === 0) return;
        sendOnCurrent(COLLAB_MSG_AWARENESS, encodeAwarenessUpdate(awareness, changed));
      };
      awareness?.on('update', onAwarenessUpdate);

      const handleMessage = (event: MessageEvent) => {
        const data = event.data;
        if (!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array)) return;
        const frame = decodeCollabFrame(data);
        if (!frame) return;
        if (frame.kind === COLLAB_MSG_AWARENESS) {
          if (awareness) applyAwarenessUpdate(awareness, frame.update, origin);
          return;
        }
        if (frame.kind === COLLAB_MSG_AWARENESS_QUERY) {
          if (!awareness) return;
          const clients = Array.from(awareness.getStates().keys());
          if (clients.length === 0) return;
          sendOnCurrent(COLLAB_MSG_AWARENESS, encodeAwarenessUpdate(awareness, clients));
          return;
        }
        Y.applyUpdate(ydoc, frame.update, origin);
      };

      const flushOpenHandshake = (openSocket: WebSocket) => {
        sendFrame(openSocket, COLLAB_MSG_SYNC, Y.encodeStateAsUpdate(ydoc));
        if (awareness) {
          sendFrame(
            openSocket,
            COLLAB_MSG_AWARENESS,
            encodeAwarenessUpdate(awareness, [awareness.clientID])
          );
          sendFrame(openSocket, COLLAB_MSG_AWARENESS_QUERY, Uint8Array.of(0));
        }
      };

      const scheduleReconnect = () => {
        if (disposed || reconnectTimer != null) return;
        const delayIndex = Math.min(reconnectAttempt, reconnectDelaysMs.length - 1);
        const delay = reconnectDelaysMs[delayIndex] ?? 15_000;
        reconnectAttempt += 1;
        reconnectTimer = setTimeoutFn(() => {
          reconnectTimer = null;
          openSocket();
        }, delay);
      };

      const openSocket = () => {
        if (disposed) return;
        clearReconnectTimer();
        intentionalClose = true;
        if (
          socket &&
          (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
        ) {
          socket.close();
        }
        intentionalClose = false;

        const next = createWebSocket(url);
        next.binaryType = 'arraybuffer';
        socket = next;

        next.addEventListener('message', handleMessage as EventListener);
        next.addEventListener('open', () => {
          if (disposed || socket !== next) return;
          reconnectAttempt = 0;
          flushOpenHandshake(next);
        });
        next.addEventListener('close', () => {
          if (disposed || intentionalClose || socket !== next) return;
          scheduleReconnect();
        });
      };

      const onReconnectSignal = () => {
        if (disposed) return;
        if (socket && socket.readyState === WebSocket.OPEN) return;
        clearReconnectTimer();
        openSocket();
      };
      const unsubscribeSignals = subscribeReconnectSignals(onReconnectSignal);

      openSocket();

      return () => {
        disposed = true;
        clearReconnectTimer();
        unsubscribeSignals();
        ydoc.off('update', onDocUpdate);
        awareness?.off('update', onAwarenessUpdate);
        intentionalClose = true;
        if (
          socket &&
          (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
        ) {
          socket.close();
        }
        socket = null;
      };
    },
  };
}
