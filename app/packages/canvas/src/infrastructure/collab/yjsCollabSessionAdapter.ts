import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import {
  collabDocumentToSchema,
  collabPatchIsEmpty,
  collabWorkspaceFocusPath,
  collabWorkspacePaths,
  createNodeComment,
  diffCollabDocuments,
  emptyCollabDocument,
  mergeCollabWorkspaceJoin,
  schemaToCollabDocument,
  type CollabDocument,
  type NodeComment,
  type SystemSchema,
} from '@archlens/core';
import {
  EMPTY_COLLAB_PRESENCE,
  colorForClientId,
  normalizeCollabDisplayName,
  presenceFromAwarenessStates,
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
  readComments,
  resolveStoredComment,
  writeComment,
  YJS_COMMENTS_MAP,
} from './yjsCommentProjection';

const COLLAB_AUTHOR_KEY = 'archlens.collabAuthorKey';

export type CollabAuthorKeyStore = {
  get(): string | null;
  set(value: string): void;
};

function browserCollabAuthorKeyStore(): CollabAuthorKeyStore {
  let memory: string | null = null;
  return {
    get() {
      try {
        if (typeof localStorage !== 'undefined') return localStorage.getItem(COLLAB_AUTHOR_KEY);
      } catch {
        /* private mode */
      }
      return memory;
    },
    set(value: string) {
      memory = value;
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(COLLAB_AUTHOR_KEY, value);
      } catch {
        /* private mode */
      }
    },
  };
}

function readStableAuthorKey(store: CollabAuthorKeyStore): string {
  const existing = store.get()?.trim() ?? '';
  if (existing.length > 0 && existing.length <= 80) return existing;
  const next = crypto.randomUUID();
  store.set(next);
  return next;
}

export type YjsCollabSessionOptions = {
  transport: CollabTransport;
  /** Wait for peers to hydrate an existing room before seeding. */
  syncWaitMs?: number;
  /** How long to wait for a Worker admit/deny before treating the transport as local. */
  controlWaitMs?: number;
  /** Same store across leave/join keeps resolve and delete after the Yjs client id changes. */
  authorKeyStore?: CollabAuthorKeyStore;
};

function documentIsEmpty(doc: CollabDocument): boolean {
  return !doc.meta.name && Object.keys(doc.nodes).length === 0;
}

function emitPresence(
  awareness: Awareness,
  onPresence: (presence: CollabPresence) => void,
  scope?: { activeDiagramPath?: string | null }
): void {
  onPresence(presenceFromAwarenessStates(awareness.getStates(), awareness.clientID, scope));
}

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
    if (!ydoc || !onComments) return;
    onComments(readComments(ydoc));
  };

  const newCommentId = (): string => crypto.randomUUID();

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
      if (!admitted || !ydoc) {
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
        let remote = stored;
        if (Object.keys(stored.diagrams).length === 0) {
          const root = readCollabDocument(ydoc);
          if (!documentIsEmpty(root)) remote = { diagrams: { [requestedPath]: root } };
        }
        const seeds = Object.keys(stored.diagrams).length > 0 ? explicit : localDiagrams;
        const merged = mergeCollabWorkspaceJoin(remote, seeds);
        for (const [path, document] of Object.entries(merged.diagrams)) {
          if (stored.diagrams[path]) continue;
          writeCollabDiagram(ydoc, path, document, YJS_LOCAL_ORIGIN);
        }
        const latest = readCollabWorkspace(ydoc);
        const focus = collabWorkspaceFocusPath(
          latest,
          requestedPath,
          explicit.map(diagram => diagram.path)
        );
        activePath = focus;
        if (focus) liveAwareness.setLocalStateField('diagramPath', focus);
        for (const [path, document] of Object.entries(latest.diagrams)) {
          lastByPath.set(path, document);
        }
        ready = true;
        if (focus && latest.diagrams[focus]) emitActive(focus, latest.diagrams[focus]);
        emitWorkspace();
        publishPresence();
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
        id: newCommentId(),
        nodeEntityRef: input.nodeEntityRef,
        authorName: author.name,
        authorClientId: author.clientId,
        authorKey: author.key,
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
      if (!existing || !authoredByMe(existing, author)) return;
      resolveStoredComment(ydoc, id, YJS_LOCAL_ORIGIN);
      emitComments();
    },

    deleteComment(id) {
      const author = localAuthor();
      if (!ydoc || !activeRoom || !author) return;
      const existing = readComments(ydoc).find(comment => comment.id === id);
      if (!existing || !authoredByMe(existing, author)) return;
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
