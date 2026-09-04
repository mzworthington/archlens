import { describe, expect, it } from 'vitest';
import {
  admitClient,
  applyClaim,
  applyEnd,
  COLLAB_SECRET_MIN_LENGTH,
  effectiveAccess,
  expirePolicyIfDue,
  sha256Hex,
} from './roomPolicy';

const now = 1_700_000_000_000;

describe('roomPolicy', () => {
  it('rejects a secret shorter than the minimum', async () => {
    const result = await applyClaim(null, {
      hostToken: 'host-token',
      access: 'secret',
      secret: 'short',
    });
    expect(result).toEqual({ ok: false, reason: 'invalid-secret' });
    expect(COLLAB_SECRET_MIN_LENGTH).toBe(8);
  });

  it('lets the first host claim an open room', async () => {
    const claimed = await applyClaim(null, { hostToken: 'host-token', access: 'open' });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    expect(effectiveAccess(claimed.policy, now)).toBe('open');
    const guest = await admitClient(claimed.policy, { secret: undefined }, now);
    expect(guest).toEqual({ ok: true, access: 'open' });
  });

  it('keeps the diagram off until a guest presents the matching secret', async () => {
    const claimed = await applyClaim(null, {
      hostToken: 'host-token',
      access: 'secret',
      secret: 'correct-secret',
    });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    expect(effectiveAccess(claimed.policy, now)).toBe('secret');

    expect(await admitClient(claimed.policy, {}, now)).toEqual({
      ok: false,
      reason: 'need-secret',
    });
    expect(await admitClient(claimed.policy, { secret: 'wrong-secret' }, now)).toEqual({
      ok: false,
      reason: 'denied',
    });
    expect(await admitClient(claimed.policy, { secret: 'correct-secret' }, now)).toEqual({
      ok: true,
      access: 'secret',
    });
  });

  it('does not store the plaintext secret', async () => {
    const claimed = await applyClaim(null, {
      hostToken: 'host-token',
      access: 'secret',
      secret: 'correct-secret',
    });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    expect(JSON.stringify(claimed.policy)).not.toContain('correct-secret');
    expect(claimed.policy.secretHash).toBe(await sha256Hex('correct-secret'));
  });

  it('lets the host rejoin with the host token and end the room', async () => {
    const claimed = await applyClaim(null, {
      hostToken: 'host-token',
      access: 'secret',
      secret: 'correct-secret',
    });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;

    expect(await admitClient(claimed.policy, { hostToken: 'host-token' }, now)).toEqual({
      ok: true,
      access: 'secret',
    });

    const ended = await applyEnd(claimed.policy, 'host-token');
    expect(ended.ok).toBe(true);
    if (!ended.ok) return;
    expect(effectiveAccess(ended.policy, now)).toBe('ended');
    expect(await admitClient(ended.policy, { secret: 'correct-secret' }, now)).toEqual({
      ok: false,
      reason: 'ended',
    });
    expect(await applyEnd(claimed.policy, 'other-token')).toEqual({
      ok: false,
      reason: 'denied',
    });
  });

  it('expires a room so new joins fail and current guests must be told', async () => {
    const claimed = await applyClaim(null, {
      hostToken: 'host-token',
      access: 'open',
      expiresAtMs: now + 1_000,
    });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    expect(await admitClient(claimed.policy, {}, now)).toEqual({ ok: true, access: 'open' });
    expect(expirePolicyIfDue(claimed.policy, now)).toBeNull();
    expect(await admitClient(claimed.policy, {}, now + 2_000)).toEqual({
      ok: false,
      reason: 'ended',
    });
    expect(expirePolicyIfDue(claimed.policy, now + 2_000)).toEqual({
      ...claimed.policy,
      access: 'ended',
      expiresAtMs: null,
    });
    expect(
      expirePolicyIfDue({ ...claimed.policy, access: 'ended', expiresAtMs: null }, now + 2_000)
    ).toBeNull();
  });

  it('does not let a second host steal an already claimed room', async () => {
    const first = await applyClaim(null, { hostToken: 'host-token-a', access: 'open' });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(
      await applyClaim(first.policy, {
        hostToken: 'host-token-b',
        access: 'secret',
        secret: 'abcdefgh',
      })
    ).toEqual({ ok: false, reason: 'already-claimed' });
  });

  it('treats an unclaimed room as not joinable by a guest', async () => {
    expect(await admitClient(null, { secret: 'abcdefgh' }, now)).toEqual({
      ok: false,
      reason: 'unclaimed',
    });
  });
});
