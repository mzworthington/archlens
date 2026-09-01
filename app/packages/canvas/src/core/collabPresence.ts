import type { CollabParticipant, CollabPeerCursor, CollabPresence } from './models/ports';
import { EMPTY_COLLAB_PRESENCE } from './models/ports';

const CURSOR_COLORS = [
  '#38bdf8',
  '#a78bfa',
  '#f472b6',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#22d3ee',
  '#c084fc',
] as const;

const DISPLAY_NAME_MAX = 40;

function hasControlChars(name: string): boolean {
  for (let i = 0; i < name.length; i += 1) {
    const code = name.charCodeAt(i);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

export function normalizeCollabDisplayName(raw: string): string | null {
  const name = raw.replace(/\s+/g, ' ').trim();
  if (name.length < 1 || name.length > DISPLAY_NAME_MAX) return null;
  if (hasControlChars(name)) return null;
  return name;
}

export function colorForClientId(clientId: number): string {
  const index = Math.abs(clientId) % CURSOR_COLORS.length;
  return CURSOR_COLORS[index] ?? CURSOR_COLORS[0];
}

function readCursor(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== 'object') return null;
  const cursor = value as { x?: unknown; y?: unknown };
  if (typeof cursor.x !== 'number' || typeof cursor.y !== 'number') return null;
  if (!Number.isFinite(cursor.x) || !Number.isFinite(cursor.y)) return null;
  return { x: cursor.x, y: cursor.y };
}

function readNamedState(value: unknown): { name: string; color: string } | null {
  if (!value || typeof value !== 'object') return null;
  const state = value as { name?: unknown; color?: unknown };
  const name = typeof state.name === 'string' ? normalizeCollabDisplayName(state.name) : null;
  if (!name) return null;
  const color = typeof state.color === 'string' && state.color.length > 0 ? state.color : null;
  return { name, color: color ?? '#38bdf8' };
}

/** Map awareness client states to UI presence. Local cursor is omitted. */
export function presenceFromAwarenessStates(
  states: ReadonlyMap<number, unknown>,
  localClientId: number
): CollabPresence {
  const cursors: CollabPeerCursor[] = [];
  const participants: CollabParticipant[] = [];
  let connectedCount = 0;

  for (const [clientId, raw] of states) {
    const named = readNamedState(raw);
    if (!named) continue;
    connectedCount += 1;
    const isLocal = clientId === localClientId;
    participants.push({
      clientId,
      name: named.name,
      color: named.color,
      isLocal,
    });
    if (isLocal) continue;
    const cursor = readCursor(
      raw && typeof raw === 'object' ? (raw as { cursor?: unknown }).cursor : null
    );
    if (!cursor) continue;
    cursors.push({
      clientId,
      name: named.name,
      color: named.color,
      x: cursor.x,
      y: cursor.y,
    });
  }

  if (connectedCount === 0) return EMPTY_COLLAB_PRESENCE;
  participants.sort((a, b) => {
    if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return { connectedCount, cursors, participants };
}
