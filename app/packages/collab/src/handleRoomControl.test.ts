import { describe, expect, it } from 'vitest';
import { handleRoomControl } from './handleRoomControl';

const now = 1_700_000_000_000;

describe('handleRoomControl', () => {
  it('admits after a host claim and refuses a later guest without the secret', async () => {
    const claimed = await handleRoomControl(
      null,
      {
        v: 1,
        op: 'claim',
        access: 'secret',
        hostToken: 'host-token',
        secret: 'correct-secret',
      },
      now
    );
    expect(claimed).toMatchObject({ admit: true, reply: { op: 'admitted', access: 'secret' } });

    const denied = await handleRoomControl(
      claimed.policy,
      {
        v: 1,
        op: 'join',
        secret: 'wrong-secret',
      },
      now
    );
    expect(denied).toEqual({
      policy: claimed.policy,
      admit: false,
      reply: { v: 1, op: 'denied' },
    });
  });

  it('broadcasts ended when the host revokes the room', async () => {
    const claimed = await handleRoomControl(
      null,
      {
        v: 1,
        op: 'claim',
        access: 'open',
        hostToken: 'host-token',
      },
      now
    );
    const ended = await handleRoomControl(
      claimed.policy,
      {
        v: 1,
        op: 'end',
        hostToken: 'host-token',
      },
      now
    );
    expect(ended.admit).toBe(false);
    expect(ended.reply).toEqual({ v: 1, op: 'ended' });
    expect(ended.broadcastEnded).toBe(true);
  });
});
