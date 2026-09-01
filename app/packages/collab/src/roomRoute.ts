const COLLAB_ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

export type CollabRoomRoute =
  { kind: 'room'; roomId: string } | { kind: 'not-found' } | { kind: 'invalid-room' };

/** Parse `/room/:id` for the Worker fetch handler. */
export function resolveCollabRoomPath(pathname: string): CollabRoomRoute {
  const match = pathname.match(/^\/room\/([^/]+)$/);
  if (!match?.[1]) return { kind: 'not-found' };
  const roomId = decodeURIComponent(match[1]);
  if (!COLLAB_ROOM_ID_PATTERN.test(roomId)) return { kind: 'invalid-room' };
  return { kind: 'room', roomId };
}
