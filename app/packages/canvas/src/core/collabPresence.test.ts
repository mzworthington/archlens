import { describe, expect, it } from 'vitest';
import {
  colorForClientId,
  normalizeCollabDisplayName,
  presenceFromAwarenessStates,
} from './collabPresence';

describe('normalizeCollabDisplayName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeCollabDisplayName('  Ada   Lovelace  ')).toBe('Ada Lovelace');
  });

  it('rejects empty, oversized, and control characters', () => {
    expect(normalizeCollabDisplayName('   ')).toBeNull();
    expect(normalizeCollabDisplayName('a'.repeat(41))).toBeNull();
    expect(normalizeCollabDisplayName('Ada\u0007')).toBeNull();
  });

  it('keeps markup as literal text', () => {
    expect(normalizeCollabDisplayName('<script>alert(1)</script>')).toBe(
      '<script>alert(1)</script>'
    );
  });
});

describe('presenceFromAwarenessStates', () => {
  it('counts named peers including self and omits the local cursor', () => {
    const states = new Map<number, unknown>([
      [1, { name: 'Ada', color: '#38bdf8', cursor: { x: 10, y: 20 } }],
      [2, { name: 'Grace', color: '#a78bfa', cursor: { x: 30, y: 40 } }],
    ]);

    expect(presenceFromAwarenessStates(states, 1)).toEqual({
      connectedCount: 2,
      cursors: [{ clientId: 2, name: 'Grace', color: '#a78bfa', x: 30, y: 40 }],
      participants: [
        { clientId: 1, name: 'Ada', color: '#38bdf8', isLocal: true },
        { clientId: 2, name: 'Grace', color: '#a78bfa', isLocal: false },
      ],
    });
  });

  it('counts a named peer without a cursor and ignores unnamed states', () => {
    const states = new Map<number, unknown>([
      [1, { name: 'Ada', color: '#38bdf8', cursor: null }],
      [2, {}],
      [3, { name: '   ' }],
    ]);

    expect(presenceFromAwarenessStates(states, 1)).toEqual({
      connectedCount: 1,
      cursors: [],
      participants: [{ clientId: 1, name: 'Ada', color: '#38bdf8', isLocal: true }],
    });
  });

  it('assigns a stable palette color per client id', () => {
    expect(colorForClientId(0)).toBe(colorForClientId(8));
    expect(colorForClientId(1)).not.toBe(colorForClientId(2));
  });
});
