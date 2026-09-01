import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import {
  collabDocumentToSchema,
  collabPatchIsEmpty,
  diffCollabDocuments,
  emptyCollabDocument,
  schemaToCollabDocument,
  type CollabDocument,
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
import { applyCollabPatch, readCollabDocument, YJS_LOCAL_ORIGIN } from './yjsSchemaProjection';

export type YjsCollabSessionOptions = {
  transport: CollabTransport;
  /** Wait for peers to hydrate an existing room before seeding. */
  syncWaitMs?: number;
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
  let activeRoom: string | null = null;
  let lastLocal = emptyCollabDocument();
  let pushing = false;
  let onPresence: ((presence: CollabPresence) => void) | null = null;

  const leave = () => {
    if (awareness) {
      awareness.setLocalState(null);
    }
    disconnect?.();
    disconnect = null;
    awareness = null;
    ydoc?.destroy();
    ydoc = null;
    activeRoom = null;
    lastLocal = emptyCollabDocument();
    onPresence?.(EMPTY_COLLAB_PRESENCE);
    onPresence = null;
  };

  const port: CollabSessionPort = {
    async join({ roomId, seedSchema, displayName, onSchema, onPresence: nextOnPresence }) {
      leave();
      const name = normalizeCollabDisplayName(displayName);
      if (!name) return;

      ydoc = new Y.Doc();
      awareness = new Awareness(ydoc);
      activeRoom = roomId;
      lastLocal = emptyCollabDocument();
      onPresence = nextOnPresence;

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

      disconnect = options.transport.connect(roomId, ydoc, awareness);
      await new Promise(resolve => setTimeout(resolve, syncWaitMs));

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
