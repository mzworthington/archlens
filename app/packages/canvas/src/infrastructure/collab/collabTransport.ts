import type { Awareness } from 'y-protocols/awareness';
import type * as Y from 'yjs';
import type { CollabClientControl, CollabServerControl } from '@archlens/collab/roomControl';

export type CollabJoinCredentials = {
  hostToken?: string;
  secret?: string;
  claim?: {
    access: 'open' | 'secret';
    secret?: string;
    expiresAtMs?: number;
  };
};

export type CollabTransportConnectOptions = {
  credentials?: CollabJoinCredentials;
  onControl?: (message: CollabServerControl) => void;
};

export type CollabTransportSession = {
  dispose: () => void;
  sendControl: (message: CollabClientControl) => void;
};

/** Connects a Y.Doc (and optional awareness) to peers. */
export type CollabTransport = {
  connect: (
    roomId: string,
    ydoc: Y.Doc,
    awareness?: Awareness,
    options?: CollabTransportConnectOptions
  ) => CollabTransportSession;
};
