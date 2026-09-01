import { describe, expect, it } from 'vitest';
import { resolveCollabRoomPath } from './roomRoute';

describe('resolveCollabRoomPath', () => {
  it('returns not-found outside /room/:id', () => {
    expect(resolveCollabRoomPath('/')).toEqual({ kind: 'not-found' });
    expect(resolveCollabRoomPath('/room')).toEqual({ kind: 'not-found' });
    expect(resolveCollabRoomPath('/room/abc/extra')).toEqual({ kind: 'not-found' });
  });

  it('rejects short or illegal room ids', () => {
    expect(resolveCollabRoomPath('/room/short')).toEqual({ kind: 'invalid-room' });
    expect(resolveCollabRoomPath('/room/bad%20room')).toEqual({ kind: 'invalid-room' });
  });

  it('accepts uuid-shaped room ids', () => {
    expect(resolveCollabRoomPath('/room/abcdefgh')).toEqual({
      kind: 'room',
      roomId: 'abcdefgh',
    });
  });
});
