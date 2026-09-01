export const COLLAB_MSG_SYNC = 0;
export const COLLAB_MSG_UPDATE = 1;
export const COLLAB_MSG_AWARENESS = 2;
export const COLLAB_MSG_AWARENESS_QUERY = 3;

export type CollabFrameKind = 0 | 1 | 2 | 3;

export function isPersistedCollabFrame(kind: number): boolean {
  return kind === COLLAB_MSG_SYNC || kind === COLLAB_MSG_UPDATE;
}

export function encodeCollabFrame(kind: CollabFrameKind, update: Uint8Array): Uint8Array {
  const frame = new Uint8Array(1 + update.byteLength);
  frame[0] = kind;
  frame.set(update, 1);
  return frame;
}

export function decodeCollabFrame(
  data: ArrayBuffer | Uint8Array
): { kind: number; update: Uint8Array } | null {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.byteLength < 2) return null;
  return { kind: bytes[0], update: bytes.subarray(1) };
}
