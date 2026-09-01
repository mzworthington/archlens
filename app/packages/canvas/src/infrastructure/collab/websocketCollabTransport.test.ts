import { describe, expect, it } from 'vitest';
import {
  COLLAB_MSG_SYNC,
  COLLAB_MSG_UPDATE,
  collabFrameToArrayBuffer,
  decodeCollabFrame,
  encodeCollabFrame,
} from './websocketCollabTransport';

describe('collab websocket frames', () => {
  it('round-trips a sync frame', () => {
    const payload = Uint8Array.from([9, 8, 7]);
    const frame = encodeCollabFrame(COLLAB_MSG_SYNC, payload);
    expect(frame[0]).toBe(COLLAB_MSG_SYNC);
    expect(decodeCollabFrame(frame)).toEqual({ kind: COLLAB_MSG_SYNC, update: payload });
  });

  it('round-trips an update frame from ArrayBuffer', () => {
    const payload = Uint8Array.from([1, 2, 3, 4]);
    const frame = encodeCollabFrame(COLLAB_MSG_UPDATE, payload);
    const decoded = decodeCollabFrame(collabFrameToArrayBuffer(frame));
    expect(decoded?.kind).toBe(COLLAB_MSG_UPDATE);
    expect(Array.from(decoded?.update ?? [])).toEqual([1, 2, 3, 4]);
  });
});
