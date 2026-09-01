import { normalizeCollabDisplayName } from '../../core';

const LAST_KEY = 'archlens.collab.displayName';
const SESSION_KEY = 'archlens.collab.displayName.session';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const listeners = new Set<() => void>();

function defaultLocal(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

function defaultSession(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage ?? null;
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeCollabDisplayName(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCollabSessionDisplayName(
  session: StorageLike | null = defaultSession()
): string | null {
  return normalizeCollabDisplayName(session?.getItem(SESSION_KEY) ?? '');
}

export function getCollabPrefillDisplayName(
  session: StorageLike | null = defaultSession(),
  local: StorageLike | null = defaultLocal()
): string {
  return (
    getCollabSessionDisplayName(session) ??
    normalizeCollabDisplayName(local?.getItem(LAST_KEY) ?? '') ??
    ''
  );
}

export function setCollabDisplayName(
  raw: string,
  session: StorageLike | null = defaultSession(),
  local: StorageLike | null = defaultLocal()
): string | null {
  const name = normalizeCollabDisplayName(raw);
  if (!name) return null;
  session?.setItem(SESSION_KEY, name);
  local?.setItem(LAST_KEY, name);
  notify();
  return name;
}
