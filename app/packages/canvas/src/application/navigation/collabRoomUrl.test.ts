import { describe, expect, it } from 'vitest';
import { COLLABORATION_FEATURE, featureStorageKey, isFeatureEnabled } from './featureGate';
import {
  createCollabRoomId,
  enableCollaborationFromShareLink,
  isValidCollabRoomId,
  parseCollabRoomId,
  withCollabRoom,
  withoutCollabRoom,
} from './collabRoomUrl';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key() {
      return null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe('collabRoomUrl', () => {
  it('accepts uuid-shaped room ids and rejects junk', () => {
    const id = createCollabRoomId();
    expect(isValidCollabRoomId(id)).toBe(true);
    expect(isValidCollabRoomId('short')).toBe(false);
    expect(isValidCollabRoomId('bad room')).toBe(false);
  });

  it('parses room from the query string and preserves other params when writing', () => {
    expect(parseCollabRoomId('?lens=chaos&room=abcdefgh')).toBe('abcdefgh');
    expect(parseCollabRoomId('room=nope')).toBeNull();
    expect(parseCollabRoomId('?room=b361b20b-f34f-4bbe-935e-f39c0f6aea44')).toBe(
      'b361b20b-f34f-4bbe-935e-f39c0f6aea44'
    );
    expect(withCollabRoom('/workspace/shop', '?lens=chaos', 'abcdefgh')).toBe(
      '/workspace/shop?lens=chaos&room=abcdefgh'
    );
    expect(withoutCollabRoom('/workspace/shop', '?lens=chaos&room=abcdefgh')).toBe(
      '/workspace/shop?lens=chaos'
    );
    expect(withoutCollabRoom('/workspace/shop', '?room=abcdefgh')).toBe('/workspace/shop');
  });

  it('turns collaboration on when a share link has a valid room', () => {
    const storage = memoryStorage();
    expect(
      enableCollaborationFromShareLink('?room=b361b20b-f34f-4bbe-935e-f39c0f6aea44', storage)
    ).toBe(true);
    expect(isFeatureEnabled(COLLABORATION_FEATURE, storage)).toBe(true);
    expect(storage.getItem(featureStorageKey(COLLABORATION_FEATURE))).toBe('1');
  });

  it('does not turn collaboration on for a missing or invalid room', () => {
    const storage = memoryStorage();
    expect(enableCollaborationFromShareLink('', storage)).toBe(false);
    expect(enableCollaborationFromShareLink('?room=nope', storage)).toBe(false);
    expect(isFeatureEnabled(COLLABORATION_FEATURE, storage)).toBe(false);
  });
});
