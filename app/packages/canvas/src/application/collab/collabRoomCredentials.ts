const HOST_KEY_PREFIX = 'archlens.collab.hostToken.';
const SECRET_KEY_PREFIX = 'archlens.collab.guestSecret.';
const CLAIM_KEY_PREFIX = 'archlens.collab.pendingClaim.';

type PendingCollabClaim = {
  access: 'open' | 'secret';
  secret?: string;
  expiresAtMs?: number;
};

function getOrCreateCollabHostToken(roomId: string): string {
  const key = `${HOST_KEY_PREFIX}${roomId}`;
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const token =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `host-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  sessionStorage.setItem(key, token);
  return token;
}

export function readCollabHostToken(roomId: string): string | null {
  return sessionStorage.getItem(`${HOST_KEY_PREFIX}${roomId}`);
}

export function saveCollabGuestSecret(roomId: string, secret: string): void {
  const trimmed = secret.trim();
  if (!trimmed) {
    sessionStorage.removeItem(`${SECRET_KEY_PREFIX}${roomId}`);
    return;
  }
  sessionStorage.setItem(`${SECRET_KEY_PREFIX}${roomId}`, trimmed);
}

function readCollabGuestSecret(roomId: string): string | null {
  return sessionStorage.getItem(`${SECRET_KEY_PREFIX}${roomId}`);
}

function savePendingCollabClaim(roomId: string, claim: PendingCollabClaim): void {
  sessionStorage.setItem(`${CLAIM_KEY_PREFIX}${roomId}`, JSON.stringify(claim));
}

function peekPendingCollabClaim(roomId: string): PendingCollabClaim | undefined {
  const raw = sessionStorage.getItem(`${CLAIM_KEY_PREFIX}${roomId}`);
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return undefined;
    const record = parsed as Record<string, unknown>;
    if (record.access !== 'open' && record.access !== 'secret') return undefined;
    return {
      access: record.access,
      secret: typeof record.secret === 'string' ? record.secret : undefined,
      expiresAtMs: typeof record.expiresAtMs === 'number' ? record.expiresAtMs : undefined,
    };
  } catch {
    return undefined;
  }
}

export function credentialsForCollabRoom(roomId: string): {
  hostToken?: string;
  secret?: string;
  claim?: PendingCollabClaim;
} {
  const claim = peekPendingCollabClaim(roomId);
  const hostToken = readCollabHostToken(roomId) ?? undefined;
  const secret = readCollabGuestSecret(roomId) ?? undefined;
  return { hostToken, secret, claim };
}

export function stageCollabHostShare(
  roomId: string,
  options: { access: 'open' | 'secret'; secret: string; expiresInHours: 0 | 8 | 24 }
): void {
  getOrCreateCollabHostToken(roomId);
  savePendingCollabClaim(roomId, {
    access: options.access,
    secret: options.access === 'secret' ? options.secret : undefined,
    expiresAtMs:
      options.expiresInHours > 0 ? Date.now() + options.expiresInHours * 60 * 60 * 1000 : undefined,
  });
}
