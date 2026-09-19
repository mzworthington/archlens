import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import {
  collabDocumentToSchema,
  collabPatchIsEmpty,
  createNodeComment,
  diffCollabDocuments,
  emptyCollabDocument,
  schemaToCollabDocument,
  type CollabDocument,
  type NodeComment,
} from '@archlens/core';
import {
  EMPTY_COLLAB_PRESENCE,
  colorForClientId,
  normalizeCollabDisplayName,
  presenceFromAwarenessStates,
  type CollabPresence,
  type CollabSessionPort,
} from '../../core';
import type { CollabTransport } from './collabTransport';
import type { CollabClientControl } from '@archlens/collab/roomControl';
import { applyCollabPatch, readCollabDocument, YJS_LOCAL_ORIGIN } from './yjsSchemaProjection';
import {
  deleteStoredComment,
  readComments,
  resolveStoredComment,
  writeComment,
  YJS_COMMENTS_MAP,
} from './yjsCommentProjection';

export type YjsCollabSessionOptions = {
  transport: CollabTransport;
  /** Wait for peers to hydrate an existing room before seeding. */
  syncWaitMs?: number;
  /** How long to wait for a Worker admit/deny before treating the transport as local. */
  controlWaitMs?: number;
};

function documentIsEmpty(doc: CollabDocument): boolean {
  return !doc.meta.name && Object.keys(doc.nodes).length === 0;
}

function emitPresence(awareness: Awareness, onPresence: (presence: CollabPresence) => void): void {
  onPresence(presenceFromAwarenessStates(awareness.getStates(), awareness.clientID));
}

/**
 * Yjs-backed CollabSessionPort. CRDT types stay inside this adapter.
 */
export function createYjsCollabSession(options: YjsCollabSessionOptions): CollabSessionPort {
  const syncWaitMs = options.syncWaitMs ?? 50;
  let ydoc: Y.Doc | null = null;
  let awareness: Awareness | null = null;
  let disconnect: (() => void) | null = null;
  let sendControl: ((message: CollabClientControl) => void) | null = null;
  let activeRoom: string | null = null;
  let lastLocal = emptyCollabDocument();
  let pushing = false;
  let onPresence: ((presence: CollabPresence) => void) | null = null;
  let onComments: ((comments: NodeComment[]) => void) | null = null;
  let unobserveComments: (() => void) | null = null;

  const emitComments = () => {
    if (!ydoc || !onComments) return;
    onComments(readComments(ydoc));
  };

  const newCommentId = (): string => crypto.randomUUID();

  const localAuthor = (): { name: string; clientId: number } | null => {
    if (!awareness) return null;
    const raw = awareness.getLocalState();
    const name =
      raw && typeof raw === 'object' && typeof (raw as { name?: unknown }).name === 'string'
        ? normalizeCollabDisplayName((raw as { name: string }).name)
        : null;
    if (!name) return null;
    return { name, clientId: awareness.clientID };
  };

  const observeComments = (doc: Y.Doc) => {
    unobserveComments?.();
    const comments = doc.getMap(YJS_COMMENTS_MAP);
    const listener = () => emitComments();
    comments.observeDeep(listener);
    unobserveComments = () => comments.unobserveDeep(listener);
  };

  const leave = () => {
    if (awareness) {
      awareness.setLocalState(null);
    }
    unobserveComments?.();
    unobserveComments = null;
    disconnect?.();
    disconnect = null;
    sendControl = null;
    awareness = null;
    ydoc?.destroy();
    ydoc = null;
    activeRoom = null;
    lastLocal = emptyCollabDocument();
    onPresence?.(EMPTY_COLLAB_PRESENCE);
    onPresence = null;
    onComments?.([]);
    onComments = null;
  };

  const port: CollabSessionPort = {
    async join({
      roomId,
      seedSchema,
      displayName,
      onSchema,
      onPresence: nextOnPresence,
      onComments: nextOnComments,
      credentials,
      onRoomControl,
    }) {
      leave();
      const name = normalizeCollabDisplayName(displayName);
      if (!name) return;

      ydoc = new Y.Doc();
      awareness = new Awareness(ydoc);
      activeRoom = roomId;
      lastLocal = emptyCollabDocument();
      onPresence = nextOnPresence;
      onComments = nextOnComments ?? null;
      observeComments(ydoc);

      ydoc.on('update', (_update, origin) => {
        if (!ydoc || origin === YJS_LOCAL_ORIGIN || pushing) return;
        lastLocal = readCollabDocument(ydoc);
        onSchema(collabDocumentToSchema(lastLocal));
      });

      awareness.on('change', () => {
        if (!awareness || !onPresence) return;
        emitPresence(awareness, onPresence);
      });

      awareness.setLocalState({
        name,
        color: colorForClientId(awareness.clientID),
        cursor: null,
      });
      emitPresence(awareness, nextOnPresence);

      const liveDoc = ydoc;
      const liveAwareness = awareness;
      if (!liveDoc || !liveAwareness) return;

      let controlSeen = false;
      let admitted = false;
      const controlWaitMs = options.controlWaitMs ?? (syncWaitMs === 0 ? 0 : 8_000);
      await new Promise<void>(resolve => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        const timer = setTimeout(finish, controlWaitMs);
        const session = options.transport.connect(roomId, liveDoc, liveAwareness, {
          credentials,
          onControl: message => {
            controlSeen = true;
            admitted = message.op === 'admitted';
            onRoomControl?.(message.op);
            clearTimeout(timer);
            finish();
          },
        });
        disconnect = session.dispose;
        sendControl = session.sendControl;
      });
      if (syncWaitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, syncWaitMs));
      }
      if (!controlSeen) admitted = controlWaitMs === 0;
      if (!admitted) {
        leave();
        return;
      }

      if (ydoc && documentIsEmpty(readCollabDocument(ydoc))) {
        const seed = schemaToCollabDocument(seedSchema);
        const patch = diffCollabDocuments(emptyCollabDocument(), seed);
        if (!collabPatchIsEmpty(patch)) {
          applyCollabPatch(ydoc, patch, YJS_LOCAL_ORIGIN);
        }
        lastLocal = readCollabDocument(ydoc);
      } else if (ydoc) {
        lastLocal = readCollabDocument(ydoc);
        onSchema(collabDocumentToSchema(lastLocal));
      }
      emitComments();
    },

    pushSchema(schema) {
      if (!ydoc || !activeRoom) return;
      const next = schemaToCollabDocument(schema);
      const patch = diffCollabDocuments(lastLocal, next);
      if (collabPatchIsEmpty(patch)) return;
      pushing = true;
      try {
        applyCollabPatch(ydoc, patch, YJS_LOCAL_ORIGIN);
        lastLocal = next;
      } finally {
        pushing = false;
      }
    },

    setCursor(position) {
      awareness?.setLocalStateField('cursor', position);
    },

    setDisplayName(raw) {
      const name = normalizeCollabDisplayName(raw);
      if (!name) return;
      awareness?.setLocalStateField('name', name);
    },

    endRoom(hostToken) {
      if (!hostToken || !sendControl) return;
      sendControl({ v: 1, op: 'end', hostToken });
    },

    addComment(input) {
      const author = localAuthor();
      if (!ydoc || !activeRoom || !author) return;
      const created = createNodeComment({
        id: newCommentId(),
        nodeEntityRef: input.nodeEntityRef,
        authorName: author.name,
        authorClientId: author.clientId,
        body: input.body,
        createdAtMs: Date.now(),
      });
      if (!created) return;
      writeComment(ydoc, created, YJS_LOCAL_ORIGIN);
      emitComments();
    },

    resolveComment(id) {
      const author = localAuthor();
      if (!ydoc || !activeRoom || !author) return;
      const existing = readComments(ydoc).find(comment => comment.id === id);
      if (!existing || existing.authorClientId !== author.clientId) return;
      resolveStoredComment(ydoc, id, YJS_LOCAL_ORIGIN);
      emitComments();
    },

    deleteComment(id) {
      const author = localAuthor();
      if (!ydoc || !activeRoom || !author) return;
      const existing = readComments(ydoc).find(comment => comment.id === id);
      if (!existing || existing.authorClientId !== author.clientId) return;
      deleteStoredComment(ydoc, id, YJS_LOCAL_ORIGIN);
      emitComments();
    },

    leave,

    isActive() {
      return activeRoom !== null;
    },

    roomId() {
      return activeRoom;
    },
  };

  return port;
}
