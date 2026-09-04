import type { CollabClientControl, CollabServerControl } from './roomControl';
import { admitClient, applyClaim, applyEnd, type RoomPolicy } from './roomPolicy';

export type RoomControlOutcome = {
  policy: RoomPolicy | null;
  admit: boolean;
  reply: CollabServerControl;
  broadcastEnded?: boolean;
};

export async function handleRoomControl(
  current: RoomPolicy | null,
  message: CollabClientControl,
  nowMs: number
): Promise<RoomControlOutcome> {
  if (message.op === 'claim') {
    const claimed = await applyClaim(current, {
      hostToken: message.hostToken,
      access: message.access,
      secret: message.secret,
      expiresAtMs: message.expiresAtMs,
    });
    if (!claimed.ok) {
      const reply: CollabServerControl =
        claimed.reason === 'already-claimed'
          ? { v: 1, op: 'denied' }
          : claimed.reason === 'invalid-secret'
            ? { v: 1, op: 'need-secret' }
            : { v: 1, op: 'denied' };
      return { policy: current, admit: false, reply };
    }
    return {
      policy: claimed.policy,
      admit: true,
      reply: { v: 1, op: 'admitted', access: message.access },
    };
  }

  if (message.op === 'end') {
    const ended = await applyEnd(current, message.hostToken);
    if (!ended.ok) {
      return { policy: current, admit: false, reply: { v: 1, op: 'denied' } };
    }
    return {
      policy: ended.policy,
      admit: false,
      reply: { v: 1, op: 'ended' },
      broadcastEnded: true,
    };
  }

  const admitted = await admitClient(
    current,
    { secret: message.secret, hostToken: message.hostToken },
    nowMs
  );
  if (admitted.ok) {
    return {
      policy: current,
      admit: true,
      reply: { v: 1, op: 'admitted', access: admitted.access },
    };
  }
  return { policy: current, admit: false, reply: { v: 1, op: admitted.reason } };
}
