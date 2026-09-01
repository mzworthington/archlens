import { describe, expect, it } from 'vitest';
import {
  COLLAB_MSG_AWARENESS,
  COLLAB_MSG_AWARENESS_QUERY,
  COLLAB_MSG_SYNC,
  COLLAB_MSG_UPDATE,
  decodeCollabFrame,
  encodeCollabFrame,
  isPersistedCollabFrame,
} from './frames';

describe('collab websocket frames', () => {
  it('round-trips a sync frame', () => {
    const payload = Uint8Array.from([9, 8, 7]);
    const frame = encodeCollabFrame(COLLAB_MSG_SYNC, payload);
    expect(frame[0]).toBe(COLLAB_MSG_SYNC);
    expect(decodeCollabFrame(frame)).toEqual({ kind: COLLAB_MSG_SYNC, update: payload });
  });

  it('rejects empty payloads', () => {
    expect(decodeCollabFrame(new Uint8Array([COLLAB_MSG_SYNC]))).toBeNull();
  });

  it('round-trips an update frame', () => {
    const payload = Uint8Array.from([1, 2, 3, 4]);
    const frame = encodeCollabFrame(COLLAB_MSG_UPDATE, payload);
    const decoded = decodeCollabFrame(frame);
    expect(decoded?.kind).toBe(COLLAB_MSG_UPDATE);
    expect(Array.from(decoded?.update ?? [])).toEqual([1, 2, 3, 4]);
  });

  it('round-trips an awareness frame without treating it as durable state', () => {
    const payload = Uint8Array.from([5, 6]);
    const frame = encodeCollabFrame(COLLAB_MSG_AWARENESS, payload);
    expect(decodeCollabFrame(frame)).toEqual({ kind: COLLAB_MSG_AWARENESS, update: payload });
    expect(isPersistedCollabFrame(COLLAB_MSG_AWARENESS)).toBe(false);
    expect(isPersistedCollabFrame(COLLAB_MSG_AWARENESS_QUERY)).toBe(false);
    expect(isPersistedCollabFrame(COLLAB_MSG_SYNC)).toBe(true);
    expect(isPersistedCollabFrame(COLLAB_MSG_UPDATE)).toBe(true);
  });
});
