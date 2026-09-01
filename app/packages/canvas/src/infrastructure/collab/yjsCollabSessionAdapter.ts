import * as Y from 'yjs';
import {
  collabDocumentToSchema,
  collabPatchIsEmpty,
  diffCollabDocuments,
  emptyCollabDocument,
  schemaToCollabDocument,
  type CollabDocument,
  type SystemSchema,
} from '@archlens/core';
import type { CollabSessionPort } from '../../core';
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

/**
 * Yjs-backed CollabSessionPort. CRDT types stay inside this adapter.
 */
export function createYjsCollabSession(options: YjsCollabSessionOptions): CollabSessionPort {
  const syncWaitMs = options.syncWaitMs ?? 50;
  let ydoc: Y.Doc | null = null;
  let disconnect: (() => void) | null = null;
  let activeRoom: string | null = null;
  let lastLocal = emptyCollabDocument();
  let pushing = false;

  const emitSchema = (onSchema: (schema: SystemSchema) => void) => {
    if (!ydoc) return;
    lastLocal = readCollabDocument(ydoc);
    onSchema(collabDocumentToSchema(lastLocal));
  };

  const leave = () => {
    disconnect?.();
    disconnect = null;
    ydoc?.destroy();
    ydoc = null;
    activeRoom = null;
    lastLocal = emptyCollabDocument();
  };

  const port: CollabSessionPort = {
    async join({ roomId, seedSchema, onSchema }) {
      leave();
      ydoc = new Y.Doc();
      activeRoom = roomId;
      lastLocal = emptyCollabDocument();

      ydoc.on('update', (_update, origin) => {
        if (!ydoc || origin === YJS_LOCAL_ORIGIN || pushing) return;
        emitSchema(onSchema);
      });

      disconnect = options.transport.connect(roomId, ydoc);
      await new Promise(resolve => setTimeout(resolve, syncWaitMs));

      if (ydoc && documentIsEmpty(readCollabDocument(ydoc))) {
        const seed = schemaToCollabDocument(seedSchema);
        const patch = diffCollabDocuments(emptyCollabDocument(), seed);
        if (!collabPatchIsEmpty(patch)) {
          applyCollabPatch(ydoc, patch, YJS_LOCAL_ORIGIN);
        }
        lastLocal = readCollabDocument(ydoc);
      } else if (ydoc) {
        emitSchema(onSchema);
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
