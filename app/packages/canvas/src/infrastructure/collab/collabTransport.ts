import type * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';

/** Connects a Y.Doc (and optional awareness) to peers. Returns a disposer. */
export type CollabTransport = {
  connect: (roomId: string, ydoc: Y.Doc, awareness?: Awareness) => () => void;
};
