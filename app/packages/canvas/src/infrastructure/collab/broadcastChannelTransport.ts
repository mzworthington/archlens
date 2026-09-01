import * as Y from 'yjs';
import type { CollabTransport } from './collabTransport';

const CHANNEL_PREFIX = 'archlens-collab:';

type ChannelMessage = { type: 'sync-request' } | { type: 'update'; update: number[] };

/**
 * Same-origin tab sync via BroadcastChannel. Enough for two local tabs;
 * cross-device rooms use the WebSocket transport.
 */
export function createBroadcastChannelTransport(): CollabTransport {
  return {
    connect(roomId, ydoc) {
      const channel = new BroadcastChannel(`${CHANNEL_PREFIX}${roomId}`);
      const origin = channel;

      const onDocUpdate = (update: Uint8Array, updateOrigin: unknown) => {
        if (updateOrigin === origin) return;
        const message: ChannelMessage = { type: 'update', update: Array.from(update) };
        channel.postMessage(message);
      };
      ydoc.on('update', onDocUpdate);

      channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'sync-request') {
          const state = Y.encodeStateAsUpdate(ydoc);
          const reply: ChannelMessage = { type: 'update', update: Array.from(state) };
          channel.postMessage(reply);
          return;
        }
        if (data.type === 'update' && Array.isArray(data.update)) {
          Y.applyUpdate(ydoc, Uint8Array.from(data.update), origin);
        }
      };

      channel.postMessage({ type: 'sync-request' } satisfies ChannelMessage);

      return () => {
        ydoc.off('update', onDocUpdate);
        channel.close();
      };
    },
  };
}
