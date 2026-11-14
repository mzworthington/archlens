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

export function documentIsEmpty(doc: CollabDocument): boolean {
  return !doc.meta.name && Object.keys(doc.nodes).length === 0;
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

  if (input.syncWaitMs > 0) {
    await new Promise(resolve => setTimeout(resolve, input.syncWaitMs));
  }
  if (!controlSeen) {
    admitted = input.controlWaitMs === 0;
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
  if (focus) awareness.setLocalStateField('diagramPath', focus);
  for (const [path, document] of Object.entries(latest.diagrams)) {
    lastByPath.set(path, document);
  }
  return { focus, latest };
}
