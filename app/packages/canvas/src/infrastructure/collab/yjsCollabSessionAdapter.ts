import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import {
  collabDocumentToSchema,
  collabPatchIsEmpty,
  collabWorkspacePaths,
  createNodeComment,
  diffCollabDocuments,
  emptyCollabDocument,
  schemaToCollabDocument,
  type CollabDocument,
  type NodeComment,
  type SystemSchema,
} from '@archlens/core';
import {
  EMPTY_COLLAB_PRESENCE,
  colorForClientId,
  normalizeCollabDisplayName,
  type CollabPresence,
  type CollabSessionPort,
  type CollabWorkspaceUpdate,
} from '../../core';
import type { CollabTransport } from './collabTransport';
import type { CollabClientControl } from '@archlens/collab/roomControl';
import { applyCollabPatch, readCollabDocument, YJS_LOCAL_ORIGIN } from './yjsSchemaProjection';
import { readCollabWorkspace, writeCollabDiagram } from './yjsWorkspaceProjection';
import {
  deleteStoredComment,
  isDeletedComment,
  mirrorNestedComments,
  readComments,
  resolveStoredComment,
  syncLegacyCommentDeletes,
  writeComment,
  YJS_COMMENTS_MAP,
} from './yjsCommentProjection';
import {
  browserCollabAuthorKeyStore,
  documentIsEmpty,
  emitPresence,
  hydrateCollabWorkspaceJoin,
  readStableAuthorKey,
  waitForCollabAdmission,
  type CollabAuthorKeyStore,
} from './yjsCollabSessionHelpers';

export type { CollabAuthorKeyStore };

export type YjsCollabSessionOptions = {
  transport: CollabTransport;
  /** Wait for peers to hydrate an existing room before seeding. */
  syncWaitMs?: number;
  /** How long to wait for a Worker admit/deny before treating the transport as local. */
  controlWaitMs?: number;
  /** Same store across leave/join keeps resolve and delete after the Yjs client id changes. */
  authorKeyStore?: CollabAuthorKeyStore;
};

/**
 * Yjs-backed CollabSessionPort. CRDT types stay inside this adapter.
 */
export function createYjsCollabSession(options: YjsCollabSessionOptions): CollabSessionPort {
  const syncWaitMs = options.syncWaitMs ?? 50;
  const authorKey = readStableAuthorKey(options.authorKeyStore ?? browserCollabAuthorKeyStore());
  let ydoc: Y.Doc | null = null;
  let awareness: Awareness | null = null;
  let disconnect: (() => void) | null = null;
  let sendControl: ((message: CollabClientControl) => void) | null = null;
  let activeRoom: string | null = null;
  let lastLocal = emptyCollabDocument();
  let pushing = false;
  let onPresence: ((presence: CollabPresence) => void) | null = null;
  let onComments: ((comments: NodeComment[]) => void) | null = null;
  let onSchema: ((schema: SystemSchema) => void) | null = null;
  let onDiagram: ((path: string, schema: SystemSchema) => void) | null = null;
  let onWorkspace: ((update: CollabWorkspaceUpdate) => void) | null = null;
  let workspaceMode = false;
  let activePath: string | null = null;
  let ready = false;
  let lastByPath = new Map<string, CollabDocument>();
  let unobserveComments: (() => void) | null = null;

  const emitComments = () => {
    if (!ydoc || !onComments || !activePath) return;
    onComments(readComments(ydoc, activePath));
  };

  const localAuthor = (): { name: string; clientId: number; key: string } | null => {
    if (!awareness) return null;
    const raw = awareness.getLocalState();
    const name =
      raw && typeof raw === 'object' && typeof (raw as { name?: unknown }).name === 'string'
        ? normalizeCollabDisplayName((raw as { name: string }).name)
        : null;
    if (!name) return null;
    return { name, clientId: awareness.clientID, key: authorKey };
  };

  const authoredByMe = (
    comment: NodeComment,
    author: { clientId: number; key: string }
  ): boolean =>
    comment.authorKey
      ? comment.authorKey === author.key
      : comment.authorClientId === author.clientId;

  const importMissingComments = (comments: readonly NodeComment[]) => {
    if (!ydoc || !activePath || comments.length === 0) return;
    const existing = new Set(readComments(ydoc, activePath).map(comment => comment.id));
    for (const comment of comments) {
      if (existing.has(comment.id) || isDeletedComment(ydoc, comment.id)) continue;
      writeComment(ydoc, activePath, comment, YJS_LOCAL_ORIGIN);
      existing.add(comment.id);
    }
  };

  const observeComments = (doc: Y.Doc) => {
    unobserveComments?.();
    const comments = doc.getMap(YJS_COMMENTS_MAP);
    const listener: Parameters<Y.Map<unknown>['observeDeep']>[0] = (events, transaction) => {
      syncLegacyCommentDeletes(doc, events, transaction.origin);
      mirrorNestedComments(doc);
      emitComments();
    };
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
    lastByPath = new Map();
    workspaceMode = false;
    activePath = null;
    ready = false;
    onPresence?.(EMPTY_COLLAB_PRESENCE);
    onPresence = null;
    onComments?.([]);
    onComments = null;
    onSchema = null;
    onDiagram = null;
    onWorkspace = null;
  };

  const publishPresence = () => {
    if (!awareness || !onPresence) return;
    emitPresence(
      awareness,
      onPresence,
      workspaceMode ? { activeDiagramPath: activePath } : undefined
    );
  };

  const emitActive = (path: string, document: CollabDocument) => {
    const schema = collabDocumentToSchema(document);
    if (workspaceMode && onDiagram) onDiagram(path, schema);
    else onSchema?.(schema);
  };

  const emitWorkspace = () => {
    if (!ydoc || !onWorkspace) return;
    const workspace = readCollabWorkspace(ydoc);
    onWorkspace({
      activePath,
      diagrams: collabWorkspacePaths(workspace).flatMap(path => {
        const document = workspace.diagrams[path];
        if (!document) return [];
        return [{ path, schema: collabDocumentToSchema(document) }];
      }),
    });
  };

  const adoptRemoteUpdate = () => {
    if (!ydoc) return;
    const stored = readCollabWorkspace(ydoc);
    if (!workspaceMode && Object.keys(stored.diagrams).length === 0) {
      const next = readCollabDocument(ydoc);
      if (collabPatchIsEmpty(diffCollabDocuments(lastLocal, next))) return;
      lastLocal = next;
      onSchema?.(collabDocumentToSchema(lastLocal));
      return;
    }
    if (!workspaceMode) {
      workspaceMode = true;
      if (activePath) awareness?.setLocalStateField('diagramPath', activePath);
      publishPresence();
    }
    let changed = false;
    const seen = new Set(Object.keys(stored.diagrams));
    for (const path of lastByPath.keys()) {
      if (seen.has(path)) continue;
      lastByPath.delete(path);
      changed = true;
    }
    for (const [path, document] of Object.entries(stored.diagrams)) {
      const prev = lastByPath.get(path) ?? emptyCollabDocument();
      if (collabPatchIsEmpty(diffCollabDocuments(prev, document))) continue;
      lastByPath.set(path, document);
      changed = true;
      if (path === activePath) emitActive(path, document);
    }
    if (changed) emitWorkspace();
  };

  const port: CollabSessionPort = {
    async join(args) {
      leave();
      const name = normalizeCollabDisplayName(args.displayName);
      if (!name) return;

      const { roomId, seedSchema, credentials, onRoomControl } = args;
      ydoc = new Y.Doc();
      awareness = new Awareness(ydoc);
      activeRoom = roomId;
      lastLocal = emptyCollabDocument();
      onPresence = args.onPresence;
      onComments = args.onComments ?? null;
      onSchema = args.onSchema;
      onDiagram = args.onDiagram ?? null;
      onWorkspace = args.onWorkspace ?? null;
      observeComments(ydoc);

      ydoc.on('update', (_update, origin) => {
        if (!ready || !ydoc || origin === YJS_LOCAL_ORIGIN || pushing) return;
        adoptRemoteUpdate();
      });

      awareness.on('change', () => {
        publishPresence();
      });

      awareness.setLocalState({
        name,
        color: colorForClientId(awareness.clientID),
        cursor: null,
        authorKey,
      });
      publishPresence();

      const liveDoc = ydoc;
      const liveAwareness = awareness;
      if (!liveDoc || !liveAwareness) return;

      const controlWaitMs = options.controlWaitMs ?? (syncWaitMs === 0 ? 0 : 8_000);
      const admission = await waitForCollabAdmission({
        transport: options.transport,
        roomId,
        doc: liveDoc,
        awareness: liveAwareness,
        credentials,
        onRoomControl,
        controlWaitMs,
        syncWaitMs,
      });
      disconnect = admission.dispose;
      sendControl = admission.sendControl;
      if (!admission.admitted || !ydoc) {
        leave();
        return;
      }

      const explicit = args.seedDiagrams ?? [];
      const requestedPath = (args.activePath || explicit[0]?.path || 'diagram.yaml').trim();
      activePath = requestedPath;
      const localDiagrams =
        explicit.length > 0 ? explicit : [{ path: requestedPath, schema: seedSchema }];
      const stored = readCollabWorkspace(ydoc);
      const enterWorkspace = Object.keys(stored.diagrams).length > 0 || localDiagrams.length > 1;

      if (enterWorkspace) {
        workspaceMode = true;
        const { focus, latest } = hydrateCollabWorkspaceJoin({
          ydoc,
          awareness: liveAwareness,
          requestedPath,
          explicit,
          localDiagrams,
          lastByPath,
        });
        activePath = focus;
        ready = true;
        if (focus && latest.diagrams[focus]) emitActive(focus, latest.diagrams[focus]);
        emitWorkspace();
        publishPresence();
        importMissingComments(args.seedComments ?? []);
        emitComments();
        return;
      }

      if (documentIsEmpty(readCollabDocument(ydoc))) {
        const seed = schemaToCollabDocument(seedSchema);
        const patch = diffCollabDocuments(emptyCollabDocument(), seed);
        if (!collabPatchIsEmpty(patch)) {
          applyCollabPatch(ydoc, patch, YJS_LOCAL_ORIGIN);
        }
        lastLocal = readCollabDocument(ydoc);
      } else {
        lastLocal = readCollabDocument(ydoc);
        onSchema?.(collabDocumentToSchema(lastLocal));
      }
      ready = true;
      importMissingComments(args.seedComments ?? []);
      emitComments();
    },

    pushSchema(schema) {
      if (!ydoc || !activeRoom) return;
      if (!workspaceMode && Object.keys(readCollabWorkspace(ydoc).diagrams).length > 0) {
        workspaceMode = true;
      }
      if (workspaceMode) {
        if (!activePath) return;
        const prev = lastByPath.get(activePath) ?? emptyCollabDocument();
        const next = schemaToCollabDocument(schema);
        const patch = diffCollabDocuments(prev, next);
        if (collabPatchIsEmpty(patch)) return;
        pushing = true;
        try {
          writeCollabDiagram(ydoc, activePath, next, YJS_LOCAL_ORIGIN);
          lastByPath.set(activePath, next);
        } finally {
          pushing = false;
        }
        return;
      }
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

    focusDiagram(path, seedSchema) {
      const nextPath = path.trim();
      if (!ydoc || !activeRoom || !nextPath) return false;
      if (!workspaceMode && Object.keys(readCollabWorkspace(ydoc).diagrams).length > 0) {
        workspaceMode = true;
      }
      if (!workspaceMode) {
        if (!activePath || nextPath === activePath) {
          activePath = nextPath;
          emitComments();
          return true;
        }
        const root = readCollabDocument(ydoc);
        if (!documentIsEmpty(root) && activePath) {
          writeCollabDiagram(ydoc, activePath, root, YJS_LOCAL_ORIGIN);
        }
        workspaceMode = true;
      }
      if (!readCollabWorkspace(ydoc).diagrams[nextPath] && seedSchema) {
        writeCollabDiagram(ydoc, nextPath, schemaToCollabDocument(seedSchema), YJS_LOCAL_ORIGIN);
      }
      const document = readCollabWorkspace(ydoc).diagrams[nextPath];
      activePath = nextPath;
      awareness?.setLocalStateField('diagramPath', nextPath);
      if (!document) {
        publishPresence();
        return false;
      }
      lastByPath.set(nextPath, document);
      ready = true;
      emitActive(nextPath, document);
      emitWorkspace();
      publishPresence();
      emitComments();
      return true;
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
        id: crypto.randomUUID(),
        nodeEntityRef: input.nodeEntityRef,
        authorName: author.name,
        authorClientId: author.clientId,
        authorKey: author.key,
        body: input.body,
        createdAtMs: Date.now(),
      });
      if (!created || !activePath) return;
      writeComment(ydoc, activePath, created, YJS_LOCAL_ORIGIN);
      emitComments();
    },

    resolveComment(id) {
      const author = localAuthor();
      if (!ydoc || !activeRoom || !activePath || !author) return;
      const existing = readComments(ydoc, activePath).find(comment => comment.id === id);
      if (!existing || !authoredByMe(existing, author)) return;
      resolveStoredComment(ydoc, activePath, id, YJS_LOCAL_ORIGIN);
      emitComments();
    },

    deleteComment(id) {
      const author = localAuthor();
      if (!ydoc || !activeRoom || !activePath || !author) return;
      const existing = readComments(ydoc, activePath).find(comment => comment.id === id);
      if (!existing || !authoredByMe(existing, author)) return;
      deleteStoredComment(ydoc, activePath, id, YJS_LOCAL_ORIGIN);
      emitComments();
    },

    seedComments(comments) {
      if (!ydoc || !activeRoom) return;
      importMissingComments(comments);
      emitComments();
    },

    leave,

    isActive() {
      return activeRoom !== null;
    },

    roomId() {
      return activeRoom;
    },

    localAuthorKey() {
      return authorKey;
    },
  };

  return port;
}
