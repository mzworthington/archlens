import { describe, expect, it } from 'vitest';
import { parseClientControl, parseServerControl } from './roomControl';

describe('roomControl', () => {
  it('parses a claim from the room creator', () => {
    expect(
      parseClientControl(
        JSON.stringify({
          v: 1,
          op: 'claim',
          access: 'secret',
          hostToken: 'token',
          secret: 'abcdefgh',
          expiresAtMs: 10,
        })
      )
    ).toEqual({
      v: 1,
      op: 'claim',
      access: 'secret',
      hostToken: 'token',
      secret: 'abcdefgh',
      expiresAtMs: 10,
    });
  });

  it('rejects malformed control text', () => {
    expect(parseClientControl('not-json')).toBeNull();
    expect(parseClientControl(JSON.stringify({ v: 1, op: 'nope' }))).toBeNull();
    expect(parseServerControl(JSON.stringify({ v: 1, op: 'admitted', access: 'open' }))).toEqual({
      v: 1,
      op: 'admitted',
      access: 'open',
    });
  });
});
