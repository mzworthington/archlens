import type * as Y from 'yjs';

/** Connects a Y.Doc to peers. Returns a disposer. */
export type CollabTransport = {
  connect: (roomId: string, ydoc: Y.Doc) => () => void;
};
