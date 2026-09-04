export type CollabClaimAccess = 'open' | 'secret';

export type CollabClientControl =
  | {
      v: 1;
      op: 'claim';
      access: CollabClaimAccess;
      hostToken: string;
      secret?: string;
      expiresAtMs?: number;
    }
  | { v: 1; op: 'join'; secret?: string; hostToken?: string }
  | { v: 1; op: 'end'; hostToken: string };

export type CollabServerControl =
  | { v: 1; op: 'admitted'; access: CollabClaimAccess }
  | { v: 1; op: 'need-secret' }
  | { v: 1; op: 'denied' }
  | { v: 1; op: 'ended' }
  | { v: 1; op: 'unclaimed' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function optionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function parseClientControl(text: string): CollabClientControl | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.v !== 1 || typeof parsed.op !== 'string') return null;
  if (parsed.op === 'claim') {
    if (parsed.access !== 'open' && parsed.access !== 'secret') return null;
    if (typeof parsed.hostToken !== 'string') return null;
    return {
      v: 1,
      op: 'claim',
      access: parsed.access,
      hostToken: parsed.hostToken,
      secret: optionalString(parsed.secret),
      expiresAtMs: optionalFiniteNumber(parsed.expiresAtMs),
    };
  }
  if (parsed.op === 'join') {
    return {
      v: 1,
      op: 'join',
      secret: optionalString(parsed.secret),
      hostToken: optionalString(parsed.hostToken),
    };
  }
  if (parsed.op === 'end' && typeof parsed.hostToken === 'string') {
    return { v: 1, op: 'end', hostToken: parsed.hostToken };
  }
  return null;
}

export function parseServerControl(text: string): CollabServerControl | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.v !== 1 || typeof parsed.op !== 'string') return null;
  if (parsed.op === 'admitted' && (parsed.access === 'open' || parsed.access === 'secret')) {
    return { v: 1, op: 'admitted', access: parsed.access };
  }
  if (
    parsed.op === 'need-secret' ||
    parsed.op === 'denied' ||
    parsed.op === 'ended' ||
    parsed.op === 'unclaimed'
  ) {
    return { v: 1, op: parsed.op };
  }
  return null;
}

export function encodeControl(message: CollabClientControl | CollabServerControl): string {
  return JSON.stringify(message);
}
