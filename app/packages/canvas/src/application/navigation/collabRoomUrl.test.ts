import { describe, expect, it } from 'vitest';
import {
  createCollabRoomId,
  isValidCollabRoomId,
  parseCollabRoomId,
  withCollabRoom,
  withoutCollabRoom,
} from './collabRoomUrl';

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
});
