import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import {
  collabWorkspaceFocusPath,
  mergeCollabWorkspaceJoin,
  type CollabDocument,
  type SystemSchema,
} from '@archlens/core';
import { presenceFromAwarenessStates, type CollabPresence } from '../../core';
import type { CollabTransport, CollabTransportConnectOptions } from './collabTransport';
import type { CollabClientControl, CollabServerControl } from '@archlens/collab/roomControl';
import { readCollabDocument, YJS_LOCAL_ORIGIN } from './yjsSchemaProjection';
import { readCollabWorkspace, writeCollabDiagram } from './yjsWorkspaceProjection';

const COLLAB_AUTHOR_KEY = 'archlens.collabAuthorKey';

export type CollabAuthorKeyStore = {
  get(): string | null;
  set(value: string): void;
};

export function browserCollabAuthorKeyStore(): CollabAuthorKeyStore {
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

export function readStableAuthorKey(store: CollabAuthorKeyStore): string {
  const existing = store.get()?.trim() ?? '';
  if (existing.length > 0 && existing.length <= 80) return existing;
  const next = crypto.randomUUID();
  store.set(next);
  return next;
}

/** Boot canvas name before a workspace/schema is chosen — must never seed a room. */
const BOOT_PLACEHOLDER_SCHEMA_NAME = 'Loading';

function isBootPlaceholderName(name: string | undefined | null): boolean {
  const trimmed = name?.trim() ?? '';
  return trimmed.length === 0 || trimmed === BOOT_PLACEHOLDER_SCHEMA_NAME;
}

/**
 * Room content that peers should adopt. A boot `Loading` meta name with no
 * nodes/deps is empty — guests used to poison rooms by seeding that placeholder.
 */
export function documentIsEmpty(doc: CollabDocument): boolean {
  if (Object.keys(doc.nodes).length > 0 || Object.keys(doc.dependencies).length > 0) {
    return false;
  }
  return isBootPlaceholderName(doc.meta.name);
}

/** Only seed when local schema is intentional content, not the boot placeholder. */
export function schemaIsSeedable(schema: SystemSchema): boolean {
  if (schema.nodes.length > 0 || schema.dependencies.length > 0) return true;
  return !isBootPlaceholderName(schema.name);
}

export function emitPresence(
  awareness: Awareness,
  onPresence: (presence: CollabPresence) => void,
  scope?: { activeDiagramPath?: string | null }
): void {
  onPresence(presenceFromAwarenessStates(awareness.getStates(), awareness.clientID, scope));
}

export async function waitForCollabAdmission(input: {
  transport: CollabTransport;
  roomId: string;
  doc: Y.Doc;
  awareness: Awareness;
  credentials?: CollabTransportConnectOptions['credentials'];
  onRoomControl?: (op: CollabServerControl['op']) => void;
  controlWaitMs: number;
  syncWaitMs: number;
}): Promise<{
  admitted: boolean;
  dispose: () => void;
  sendControl: (message: CollabClientControl) => void;
}> {
  let controlSeen = false;
  let admitted = false;
  let dispose: () => void = () => {};
  let sendControl: (message: CollabClientControl) => void = () => {};
  let remoteSynced = false;
  let resolveSyncWait: (() => void) | null = null;

  const onRemoteUpdate = (_update: Uint8Array, origin: unknown) => {
    if (origin === YJS_LOCAL_ORIGIN) return;
    remoteSynced = true;
    resolveSyncWait?.();
  };
  // Listen before connect so a Durable Object snapshot during admit still counts.
  input.doc.on('update', onRemoteUpdate);

  try {
    await new Promise<void>(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const timer = setTimeout(finish, input.controlWaitMs);
      const session = input.transport.connect(input.roomId, input.doc, input.awareness, {
        credentials: input.credentials,
        onControl: message => {
          controlSeen = true;
          admitted = message.op === 'admitted';
          input.onRoomControl?.(message.op);
          clearTimeout(timer);
          finish();
        },
      });
      dispose = session.dispose;
      sendControl = session.sendControl;
    });

    if (input.syncWaitMs > 0 && admitted && !remoteSynced) {
      await new Promise<void>(resolve => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolveSyncWait = null;
          clearTimeout(timer);
          resolve();
        };
        resolveSyncWait = finish;
        const timer = setTimeout(finish, input.syncWaitMs);
      });
    }
    if (!controlSeen) {
      admitted = input.controlWaitMs === 0;
    }
  } finally {
    input.doc.off('update', onRemoteUpdate);
    resolveSyncWait = null;
  }

  return { admitted, dispose, sendControl };
}

export function hydrateCollabWorkspaceJoin(input: {
  ydoc: Y.Doc;
  awareness: Awareness;
  requestedPath: string;
  explicit: readonly { path: string; schema: SystemSchema }[];
  localDiagrams: readonly { path: string; schema: SystemSchema }[];
  lastByPath: Map<string, CollabDocument>;
}): { focus: string | null; latest: ReturnType<typeof readCollabWorkspace> } {
  const { ydoc, awareness, requestedPath, explicit, localDiagrams, lastByPath } = input;
  const stored = readCollabWorkspace(ydoc);
  let remote = stored;
  if (Object.keys(stored.diagrams).length === 0) {
    const root = readCollabDocument(ydoc);
    if (!documentIsEmpty(root)) remote = { diagrams: { [requestedPath]: root } };
  }
  const candidateSeeds = Object.keys(stored.diagrams).length > 0 ? explicit : localDiagrams;
  const seeds = candidateSeeds.filter(diagram => schemaIsSeedable(diagram.schema));
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
  if (focus) awareness.setLocalStateField('diagramPath', focus);
  for (const [path, document] of Object.entries(latest.diagrams)) {
    lastByPath.set(path, document);
  }
  return { focus, latest };
}
