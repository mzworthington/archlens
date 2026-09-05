import { describe, expect, it, vi } from 'vitest';
import { printCliHelp } from './cliHelp.ts';
import {
  architectureFlagNames,
  assertKnownFlags,
  extractFlagNamesFromText,
} from './cliFlagCatalog.ts';

function captureHelp(topic: 'overview' | 'scan'): string {
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
  printCliHelp(topic);
  const text = spy.mock.calls.map(call => String(call[0] ?? '')).join('\n');
  spy.mockRestore();
  return text;
}

describe('CLI flag catalog', () => {
  it('accepts every flag printed in overview and scan help', () => {
    const parseFlags = architectureFlagNames();
    const helpFlags = extractFlagNamesFromText(
      `${captureHelp('overview')}\n${captureHelp('scan')}`
    );

    for (const flag of helpFlags) {
      expect(parseFlags.has(flag), `${flag} is in help but not accepted by parse`).toBe(true);
    }
  });

  it('prints every architecture parse flag in overview or scan help', () => {
    const parseFlags = architectureFlagNames();
    const helpFlags = extractFlagNamesFromText(
      `${captureHelp('overview')}\n${captureHelp('scan')}`
    );

    for (const flag of parseFlags) {
      expect(helpFlags.has(flag), `${flag} is parsed but missing from help`).toBe(true);
    }
  });

  it('reports an unknown flag on stderr', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as typeof process.exit);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => assertKnownFlags(['scan', '--not-a-real-flag'])).toThrow('exit');
    expect(error.mock.calls.some(call => String(call[0]).includes('Unknown flag'))).toBe(true);

    exit.mockRestore();
    error.mockRestore();
  });
});
