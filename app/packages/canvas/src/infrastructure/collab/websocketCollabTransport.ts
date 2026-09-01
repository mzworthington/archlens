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

export { COLLAB_MSG_SYNC, COLLAB_MSG_UPDATE, decodeCollabFrame, encodeCollabFrame };

export function collabFrameToArrayBuffer(frame: Uint8Array): ArrayBuffer {
  return frame.buffer.slice(frame.byteOffset, frame.byteOffset + frame.byteLength) as ArrayBuffer;
}

function sendFrame(socket: WebSocket, kind: 0 | 1 | 2 | 3, payload: Uint8Array): void {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(collabFrameToArrayBuffer(encodeCollabFrame(kind, payload)));
}

export function createWebsocketCollabTransport(baseUrl: string): CollabTransport {
  const normalized = baseUrl.replace(/\/$/, '');

  return {
    connect(roomId, ydoc, awareness) {
      const url = `${normalized}/room/${encodeURIComponent(roomId)}`;
      const socket = new WebSocket(url);
      socket.binaryType = 'arraybuffer';
      const origin = socket;

      const onDocUpdate = (update: Uint8Array, updateOrigin: unknown) => {
        if (updateOrigin === origin) return;
        sendFrame(socket, COLLAB_MSG_UPDATE, update);
      };
      ydoc.on('update', onDocUpdate);

      const onAwarenessUpdate = (
        changes: { added: number[]; updated: number[]; removed: number[] },
        updateOrigin: unknown
      ) => {
        if (!awareness || updateOrigin === origin) return;
        const changed = [...changes.added, ...changes.updated, ...changes.removed];
        if (changed.length === 0) return;
        sendFrame(socket, COLLAB_MSG_AWARENESS, encodeAwarenessUpdate(awareness, changed));
      };
      awareness?.on('update', onAwarenessUpdate);

      socket.addEventListener('message', event => {
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
          sendFrame(socket, COLLAB_MSG_AWARENESS, encodeAwarenessUpdate(awareness, clients));
          return;
        }
        Y.applyUpdate(ydoc, frame.update, origin);
      });

      socket.addEventListener('open', () => {
        sendFrame(socket, COLLAB_MSG_SYNC, Y.encodeStateAsUpdate(ydoc));
        if (awareness) {
          sendFrame(
            socket,
            COLLAB_MSG_AWARENESS,
            encodeAwarenessUpdate(awareness, [awareness.clientID])
          );
          sendFrame(socket, COLLAB_MSG_AWARENESS_QUERY, Uint8Array.of(0));
        }
      });

      return () => {
        ydoc.off('update', onDocUpdate);
        awareness?.off('update', onAwarenessUpdate);
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      };
    },
  };
}
