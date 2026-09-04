import * as Y from 'yjs';
import { applyAwarenessUpdate, encodeAwarenessUpdate, type Awareness } from 'y-protocols/awareness';
import type { CollabTransport } from './collabTransport';

const CHANNEL_PREFIX = 'archlens-collab:';

type ChannelMessage =
  | { type: 'sync-request' }
  | { type: 'update'; update: number[] }
  | { type: 'awareness'; update: number[] }
  | { type: 'awareness-query' };

function encodeAwarenessClients(awareness: Awareness, clients: number[]): number[] | null {
  if (clients.length === 0) return null;
  return Array.from(encodeAwarenessUpdate(awareness, clients));
}

/**
 * Same-origin tab sync via BroadcastChannel. Enough for two local tabs;
 * cross-device rooms use the WebSocket transport.
 */
export function createBroadcastChannelTransport(): CollabTransport {
  return {
    connect(roomId, ydoc, awareness) {
      const channel = new BroadcastChannel(`${CHANNEL_PREFIX}${roomId}`);
      const origin = channel;

      const onDocUpdate = (update: Uint8Array, updateOrigin: unknown) => {
        if (updateOrigin === origin) return;
        const message: ChannelMessage = { type: 'update', update: Array.from(update) };
        channel.postMessage(message);
      };
      ydoc.on('update', onDocUpdate);

      const onAwarenessUpdate = (
        changes: { added: number[]; updated: number[]; removed: number[] },
        updateOrigin: unknown
      ) => {
        if (!awareness || updateOrigin === origin) return;
        const encoded = encodeAwarenessClients(awareness, [
          ...changes.added,
          ...changes.updated,
          ...changes.removed,
        ]);
        if (!encoded) return;
        const message: ChannelMessage = { type: 'awareness', update: encoded };
        channel.postMessage(message);
      };
      awareness?.on('update', onAwarenessUpdate);

      channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'sync-request') {
          const state = Y.encodeStateAsUpdate(ydoc);
          const reply: ChannelMessage = { type: 'update', update: Array.from(state) };
          channel.postMessage(reply);
          if (awareness) {
            const encoded = encodeAwarenessClients(
              awareness,
              Array.from(awareness.getStates().keys())
            );
            if (encoded) {
              channel.postMessage({ type: 'awareness', update: encoded } satisfies ChannelMessage);
            }
          }
          return;
        }
        if (data.type === 'awareness-query' && awareness) {
          const encoded = encodeAwarenessClients(
            awareness,
            Array.from(awareness.getStates().keys())
          );
          if (encoded) {
            channel.postMessage({ type: 'awareness', update: encoded } satisfies ChannelMessage);
          }
          return;
        }
        if (data.type === 'update' && Array.isArray(data.update)) {
          Y.applyUpdate(ydoc, Uint8Array.from(data.update), origin);
          return;
        }
        if (data.type === 'awareness' && Array.isArray(data.update) && awareness) {
          applyAwarenessUpdate(awareness, Uint8Array.from(data.update), origin);
        }
      };

      channel.postMessage({ type: 'sync-request' } satisfies ChannelMessage);
      if (awareness) {
        const encoded = encodeAwarenessClients(awareness, [awareness.clientID]);
        if (encoded) {
          channel.postMessage({ type: 'awareness', update: encoded } satisfies ChannelMessage);
        }
        channel.postMessage({ type: 'awareness-query' } satisfies ChannelMessage);
      }

      return {
        dispose: () => {
          ydoc.off('update', onDocUpdate);
          awareness?.off('update', onAwarenessUpdate);
          channel.close();
        },
        sendControl: () => {},
      };
    },
  };
}
