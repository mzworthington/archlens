import * as Y from 'yjs';
import { COLLAB_MSG_SYNC, COLLAB_MSG_UPDATE, decodeCollabFrame, encodeCollabFrame } from './frames';
import { resolveCollabRoomPath } from './roomRoute';

export interface Env {
  COLLAB_ROOMS: DurableObjectNamespace;
}

export class CollabRoom {
  private doc: Y.Doc | null = null;

  constructor(
    private readonly ctx: DurableObjectState,
    _env: Env
  ) {}

  private async loadDoc(): Promise<Y.Doc> {
    if (this.doc) return this.doc;
    const doc = new Y.Doc();
    const stored = await this.ctx.storage.get<ArrayBuffer>('ydoc');
    if (stored) {
      Y.applyUpdate(doc, new Uint8Array(stored));
    }
    this.doc = doc;
    return doc;
  }

  private async persist(doc: Y.Doc): Promise<void> {
    const update = Y.encodeStateAsUpdate(doc);
    await this.ctx.storage.put('ydoc', update.slice().buffer);
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);

    const doc = await this.loadDoc();
    const state = Y.encodeStateAsUpdate(doc);
    if (state.byteLength > 0) {
      server.send(encodeCollabFrame(COLLAB_MSG_SYNC, state));
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    if (typeof message === 'string') return;
    const frame = decodeCollabFrame(message);
    if (!frame) return;
    const doc = await this.loadDoc();
    Y.applyUpdate(doc, frame.update);
    await this.persist(doc);
    const outbound = encodeCollabFrame(COLLAB_MSG_UPDATE, frame.update);
    for (const peer of this.ctx.getWebSockets()) {
      if (peer !== ws) peer.send(outbound);
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const route = resolveCollabRoomPath(new URL(request.url).pathname);
    if (route.kind === 'not-found') {
      return new Response('Not found', { status: 404 });
    }
    if (route.kind === 'invalid-room') {
      return new Response('Invalid room', { status: 400 });
    }
    const id = env.COLLAB_ROOMS.idFromName(route.roomId);
    return env.COLLAB_ROOMS.get(id).fetch(request);
  },
};
