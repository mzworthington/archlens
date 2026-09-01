import * as Y from 'yjs';
import type { CollabTransport } from './collabTransport';
import {
  COLLAB_MSG_SYNC,
  COLLAB_MSG_UPDATE,
  decodeCollabFrame,
  encodeCollabFrame,
} from '@archlens/collab/frames';

export { COLLAB_MSG_SYNC, COLLAB_MSG_UPDATE, decodeCollabFrame, encodeCollabFrame };

export function collabFrameToArrayBuffer(frame: Uint8Array): ArrayBuffer {
  return frame.buffer.slice(frame.byteOffset, frame.byteOffset + frame.byteLength) as ArrayBuffer;
}

export function createWebsocketCollabTransport(baseUrl: string): CollabTransport {
  const normalized = baseUrl.replace(/\/$/, '');

  return {
    connect(roomId, ydoc) {
      const url = `${normalized}/room/${encodeURIComponent(roomId)}`;
      const socket = new WebSocket(url);
      socket.binaryType = 'arraybuffer';
      const origin = socket;

      const onDocUpdate = (update: Uint8Array, updateOrigin: unknown) => {
        if (updateOrigin === origin) return;
        if (socket.readyState !== WebSocket.OPEN) return;
        socket.send(collabFrameToArrayBuffer(encodeCollabFrame(COLLAB_MSG_UPDATE, update)));
      };
      ydoc.on('update', onDocUpdate);

      socket.addEventListener('message', event => {
        const data = event.data;
        if (!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array)) return;
        const frame = decodeCollabFrame(data);
        if (!frame) return;
        Y.applyUpdate(ydoc, frame.update, origin);
      });

      socket.addEventListener('open', () => {
        socket.send(
          collabFrameToArrayBuffer(encodeCollabFrame(COLLAB_MSG_SYNC, Y.encodeStateAsUpdate(ydoc)))
        );
      });

      return () => {
        ydoc.off('update', onDocUpdate);
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      };
    },
  };
}
