export const COLLAB_SECRET_MIN_LENGTH = 8;

export type RoomAccess = 'open' | 'secret' | 'ended';

export type RoomPolicy = {
  access: 'open' | 'secret' | 'ended';
  secretHash: string | null;
  hostTokenHash: string;
  expiresAtMs: number | null;
};

export type ClaimInput = {
  hostToken: string;
  access: 'open' | 'secret';
  secret?: string;
  expiresAtMs?: number | null;
};

export type AdmitInput = {
  secret?: string;
  hostToken?: string;
};

export type ClaimResult =
  | { ok: true; policy: RoomPolicy }
  | { ok: false; reason: 'invalid-secret' | 'already-claimed' | 'invalid-token' };

export type AdmitResult =
  | { ok: true; access: 'open' | 'secret' }
  | { ok: false; reason: 'need-secret' | 'denied' | 'ended' | 'unclaimed' };

export type EndResult = { ok: true; policy: RoomPolicy } | { ok: false; reason: 'denied' };

export function parseStoredPolicy(value: unknown): RoomPolicy | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.access !== 'open' && record.access !== 'secret' && record.access !== 'ended') {
    return null;
  }
  if (typeof record.hostTokenHash !== 'string') return null;
  if (record.secretHash !== null && typeof record.secretHash !== 'string') return null;
  if (record.expiresAtMs !== null && typeof record.expiresAtMs !== 'number') return null;
  return {
    access: record.access,
    secretHash: record.secretHash,
    hostTokenHash: record.hostTokenHash,
    expiresAtMs: record.expiresAtMs,
  };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(new Uint8Array(digest));
}

/** Constant-time compare for equal-length hex digests. */
export function digestEquals(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mismatch === 0;
}

export function effectiveAccess(policy: RoomPolicy, nowMs: number): RoomAccess {
  if (policy.access === 'ended') return 'ended';
  if (policy.expiresAtMs != null && nowMs >= policy.expiresAtMs) return 'ended';
  return policy.access;
}

function normalizeSecret(secret: string | undefined): string | null {
  const trimmed = secret?.trim() ?? '';
  if (trimmed.length < COLLAB_SECRET_MIN_LENGTH) return null;
  return trimmed;
}

function normalizeToken(token: string | undefined): string | null {
  const trimmed = token?.trim() ?? '';
  return trimmed.length >= 8 ? trimmed : null;
}

export async function applyClaim(
  current: RoomPolicy | null,
  input: ClaimInput
): Promise<ClaimResult> {
  const hostToken = normalizeToken(input.hostToken);
  if (!hostToken) return { ok: false, reason: 'invalid-token' };
  if (current) return { ok: false, reason: 'already-claimed' };

  if (input.access === 'secret') {
    const secret = normalizeSecret(input.secret);
    if (!secret) return { ok: false, reason: 'invalid-secret' };
    return {
      ok: true,
      policy: {
        access: 'secret',
        secretHash: await sha256Hex(secret),
        hostTokenHash: await sha256Hex(hostToken),
        expiresAtMs: input.expiresAtMs ?? null,
      },
    };
  }

  return {
    ok: true,
    policy: {
      access: 'open',
      secretHash: null,
      hostTokenHash: await sha256Hex(hostToken),
      expiresAtMs: input.expiresAtMs ?? null,
    },
  };
}

export async function admitClient(
  current: RoomPolicy | null,
  input: AdmitInput,
  nowMs: number
): Promise<AdmitResult> {
  if (!current) return { ok: false, reason: 'unclaimed' };
  const access = effectiveAccess(current, nowMs);
  if (access === 'ended') return { ok: false, reason: 'ended' };

  const hostToken = normalizeToken(input.hostToken);
  if (hostToken && digestEquals(current.hostTokenHash, await sha256Hex(hostToken))) {
    return { ok: true, access };
  }

  if (access === 'open') return { ok: true, access: 'open' };

  const secret = normalizeSecret(input.secret);
  if (!secret) return { ok: false, reason: 'need-secret' };
  if (!current.secretHash || !digestEquals(current.secretHash, await sha256Hex(secret))) {
    return { ok: false, reason: 'denied' };
  }
  return { ok: true, access: 'secret' };
}

export async function applyEnd(current: RoomPolicy | null, hostToken: string): Promise<EndResult> {
  if (!current) return { ok: false, reason: 'denied' };
  const token = normalizeToken(hostToken);
  if (!token || !digestEquals(current.hostTokenHash, await sha256Hex(token))) {
    return { ok: false, reason: 'denied' };
  }
  return { ok: true, policy: { ...current, access: 'ended', expiresAtMs: null } };
}
