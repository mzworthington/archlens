export const COLLAB_MSG_SYNC = 0;
export const COLLAB_MSG_UPDATE = 1;

export function encodeCollabFrame(kind: 0 | 1, update: Uint8Array): Uint8Array {
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
