import { describe, expect, it, vi } from 'vitest';
import {
  assertKnownCliFlags,
  catalogFlagNames,
  extractCliFlagTokens,
  HELP_TOPICS,
  unknownCliFlag,
} from './cliFlagCatalog.ts';
import { printCliHelp, type HelpTopic } from './cliHelp.ts';

function captureHelp(topic: HelpTopic): string {
  const lines: string[] = [];
  const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  });
  printCliHelp(topic);
  spy.mockRestore();
  return lines.join('\n');
}

function documentedHelpFlags(): string[] {
  const flags = new Set<string>();
  for (const topic of HELP_TOPICS) {
    for (const flag of extractCliFlagTokens(captureHelp(topic))) {
      flags.add(flag);
    }
  }
  return [...flags].sort((a, b) => a.localeCompare(b));
}

describe('cli flag catalog', () => {
  it('keeps every help flag accepted by parse and every parse flag in help', () => {
    const helpFlags = documentedHelpFlags();
    const parseFlags = catalogFlagNames();

    expect(helpFlags.filter(flag => !parseFlags.includes(flag))).toEqual([]);
    expect(parseFlags.filter(flag => !helpFlags.includes(flag))).toEqual([]);

    for (const flag of extractCliFlagTokens(captureHelp('overview'))) {
      expect(unknownCliFlag([flag])).toBeUndefined();
    }
  });

  it('reports an unknown flag on stderr', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as typeof process.exit);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => assertKnownCliFlags(['scan', '--not-a-real-flag'])).toThrow('exit');
    expect(error.mock.calls.some(call => String(call[0]).includes('Unknown flag'))).toBe(true);
    expect(error.mock.calls.some(call => String(call[0]).includes('--not-a-real-flag'))).toBe(true);

    exit.mockRestore();
    error.mockRestore();
  });
});
