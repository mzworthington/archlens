const COLLAB_ROOM_PARAM = 'room';

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

export function isValidCollabRoomId(roomId: string): boolean {
  return ROOM_ID_PATTERN.test(roomId);
}

export function createCollabRoomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function queryFromSearch(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

export function parseCollabRoomId(search: string): string | null {
  const room = queryFromSearch(search).get(COLLAB_ROOM_PARAM)?.trim() ?? '';
  return isValidCollabRoomId(room) ? room : null;
}

export function withCollabRoom(pathname: string, search: string, roomId: string): string {
  const params = queryFromSearch(search);
  params.set(COLLAB_ROOM_PARAM, roomId);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function withoutCollabRoom(pathname: string, search: string): string {
  const params = queryFromSearch(search);
  params.delete(COLLAB_ROOM_PARAM);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
