import * as Y from 'yjs';
import {
  COLLAB_MSG_SYNC,
  COLLAB_MSG_UPDATE,
  COLLAB_MSG_AWARENESS,
  COLLAB_MSG_AWARENESS_QUERY,
  decodeCollabFrame,
  encodeCollabFrame,
  isPersistedCollabFrame,
} from './frames';
import { handleRoomControl } from './handleRoomControl';
import { collabHealthResponse, isCollabHealthPath } from './health';
import { encodeControl, parseClientControl } from './roomControl';
import { expirePolicyIfDue, parseStoredPolicy, type RoomPolicy } from './roomPolicy';
import { resolveCollabRoomPath } from './roomRoute';

export interface Env {
  COLLAB_ROOMS: DurableObjectNamespace;
  GIT_SHA?: string;
}

type SocketGate = { admitted: boolean };

const POLICY_KEY = 'policy';

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

  private async loadPolicy(): Promise<RoomPolicy | null> {
    return parseStoredPolicy(await this.ctx.storage.get(POLICY_KEY));
  }

  private gate(ws: WebSocket): SocketGate {
    const stored = ws.deserializeAttachment() as SocketGate | null | undefined;
    return stored ?? { admitted: false };
  }

  private setGate(ws: WebSocket, gate: SocketGate): void {
    ws.serializeAttachment(gate);
  }

  private async sendSnapshot(ws: WebSocket): Promise<void> {
    const doc = await this.loadDoc();
    const state = Y.encodeStateAsUpdate(doc);
    if (state.byteLength > 0) {
      ws.send(encodeCollabFrame(COLLAB_MSG_SYNC, state));
    }
  }

  private async closeAll(reason: 'ended'): Promise<void> {
    const payload = encodeControl({ v: 1, op: reason });
    for (const peer of this.ctx.getWebSockets()) {
      try {
        peer.send(payload);
        peer.close(1000, reason);
      } catch {}
    }
  }

  private async syncAlarm(policy: RoomPolicy | null): Promise<void> {
    if (policy?.expiresAtMs != null && policy.access !== 'ended') {
      await this.ctx.storage.setAlarm(policy.expiresAtMs);
      return;
    }
    await this.ctx.storage.deleteAlarm();
  }

  private async endIfExpired(nowMs = Date.now()): Promise<boolean> {
    const current = await this.loadPolicy();
    if (!current) return false;
    const expired = expirePolicyIfDue(current, nowMs);
    if (!expired) return false;
    await this.ctx.storage.put(POLICY_KEY, expired);
    await this.syncAlarm(expired);
    await this.closeAll('ended');
    return true;
  }

  async alarm(): Promise<void> {
    await this.endIfExpired();
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    this.setGate(server, { admitted: false });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    if (typeof message === 'string') {
      const control = parseClientControl(message);
      if (!control) {
        ws.send(encodeControl({ v: 1, op: 'denied' }));
        return;
      }
      if (await this.endIfExpired()) return;
      const current = await this.loadPolicy();
      const outcome = await handleRoomControl(current, control, Date.now());
      if (outcome.policy) {
        await this.ctx.storage.put(POLICY_KEY, outcome.policy);
        await this.syncAlarm(outcome.policy);
      }
      ws.send(encodeControl(outcome.reply));
      if (outcome.broadcastEnded) {
        await this.closeAll('ended');
        return;
      }
      if (outcome.admit) {
        this.setGate(ws, { admitted: true });
        await this.sendSnapshot(ws);
      }
      return;
    }

    if (await this.endIfExpired()) return;
    if (!this.gate(ws).admitted) return;

    const frame = decodeCollabFrame(message);
    if (!frame) return;

    if (frame.kind === COLLAB_MSG_AWARENESS || frame.kind === COLLAB_MSG_AWARENESS_QUERY) {
      const outbound = encodeCollabFrame(frame.kind, frame.update);
      for (const peer of this.ctx.getWebSockets()) {
        if (peer !== ws && this.gate(peer).admitted) peer.send(outbound);
      }
      return;
    }

    if (!isPersistedCollabFrame(frame.kind)) return;

    const doc = await this.loadDoc();
    Y.applyUpdate(doc, frame.update);
    await this.persist(doc);
    const outbound = encodeCollabFrame(COLLAB_MSG_UPDATE, frame.update);
    for (const peer of this.ctx.getWebSockets()) {
      if (peer !== ws && this.gate(peer).admitted) peer.send(outbound);
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (isCollabHealthPath(pathname)) {
      return collabHealthResponse(env.GIT_SHA);
    }
    const route = resolveCollabRoomPath(pathname);
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
