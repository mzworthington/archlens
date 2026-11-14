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

type SocketGate = { admitted: boolean; failedAttempts?: number };

const POLICY_KEY = 'policy';
const LEGACY_YDOC_KEY = 'ydoc';
const YDOC_CHUNKS_KEY = 'ydoc:chunks';
export const YDOC_CHUNK_BYTES = 64 * 1024;
export const MAX_COLLAB_FRAME_BYTES = 1024 * 1024;
export const MAX_AUTH_FAILURES = 3;

function ydocChunkKey(index: number): string {
  return `ydoc:${index}`;
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
    const chunkCount = await this.ctx.storage.get<number>(YDOC_CHUNKS_KEY);
    if (typeof chunkCount === 'number' && chunkCount > 0) {
      const parts: Uint8Array[] = [];
      let totalLength = 0;
      for (let i = 0; i < chunkCount; i++) {
        const chunk = await this.ctx.storage.get<ArrayBuffer>(ydocChunkKey(i));
        if (chunk) {
          const bytes = new Uint8Array(chunk);
          parts.push(bytes);
          totalLength += bytes.byteLength;
        }
      }
      if (totalLength > 0) {
        const merged = new Uint8Array(totalLength);
        let offset = 0;
        for (const part of parts) {
          merged.set(part, offset);
          offset += part.byteLength;
        }
        try {
          Y.applyUpdate(doc, merged);
        } catch {
          // Ignore corrupted stored state and start fresh
        }
      }
    } else {
      const stored = await this.ctx.storage.get<ArrayBuffer>(LEGACY_YDOC_KEY);
      if (stored) {
        try {
          Y.applyUpdate(doc, new Uint8Array(stored));
        } catch {
          // Ignore corrupted legacy state
        }
      }
    }
    this.doc = doc;
    return doc;
  }

  private async persist(doc: Y.Doc): Promise<void> {
    const update = Y.encodeStateAsUpdate(doc);
    const prevChunks = (await this.ctx.storage.get<number>(YDOC_CHUNKS_KEY)) ?? 0;
    const chunkCount = Math.ceil(update.byteLength / YDOC_CHUNK_BYTES);
    const entries: Record<string, unknown> = {
      [YDOC_CHUNKS_KEY]: chunkCount,
    };
    for (let i = 0; i < chunkCount; i++) {
      const start = i * YDOC_CHUNK_BYTES;
      const end = Math.min(start + YDOC_CHUNK_BYTES, update.byteLength);
      entries[ydocChunkKey(i)] = update.slice(start, end).buffer;
    }
    await this.ctx.storage.put(entries);

    const staleKeys: string[] = [LEGACY_YDOC_KEY];
    for (let i = chunkCount; i < prevChunks; i++) {
      staleKeys.push(ydocChunkKey(i));
    }
    await this.ctx.storage.delete(staleKeys);
  }

  private async purgeDocStorage(): Promise<void> {
    this.doc = null;
    const prevChunks = (await this.ctx.storage.get<number>(YDOC_CHUNKS_KEY)) ?? 0;
    const keysToDelete: string[] = [LEGACY_YDOC_KEY, YDOC_CHUNKS_KEY];
    for (let i = 0; i < prevChunks; i++) {
      keysToDelete.push(ydocChunkKey(i));
    }
    await this.ctx.storage.delete(keysToDelete);
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
    await this.purgeDocStorage();
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
        await this.purgeDocStorage();
        await this.closeAll('ended');
        return;
      }
      if (outcome.admit) {
        this.setGate(ws, { admitted: true, failedAttempts: 0 });
        await this.sendSnapshot(ws);
        return;
      }
      const attemptedCredentials =
        (control.op === 'join' && Boolean(control.secret || control.hostToken)) ||
        control.op === 'claim' ||
        control.op === 'end';
      if (
        attemptedCredentials &&
        (outcome.reply.op === 'denied' || outcome.reply.op === 'need-secret')
      ) {
        const prevGate = this.gate(ws);
        const failedAttempts = (prevGate.failedAttempts ?? 0) + 1;
        this.setGate(ws, { ...prevGate, failedAttempts });
        if (failedAttempts >= MAX_AUTH_FAILURES) {
          try {
            ws.close(1008, 'denied');
          } catch {}
        }
      }
      return;
    }

    if (await this.endIfExpired()) return;
    if (!this.gate(ws).admitted) return;
    if (message.byteLength > MAX_COLLAB_FRAME_BYTES) return;

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
    try {
      Y.applyUpdate(doc, frame.update);
    } catch {
      return;
    }
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
