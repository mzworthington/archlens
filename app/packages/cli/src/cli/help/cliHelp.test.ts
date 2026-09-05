import { describe, expect, it, vi } from 'vitest';
import {
  assertKnownSubcommand,
  isKnownSubcommand,
  printCliHelp,
  resolveHelpRequest,
  suggestSubcommand,
  wantsHelpFlag,
} from './index.ts';

describe('cliHelp', () => {
  it('detects help flags', () => {
    expect(wantsHelpFlag(['--help'])).toBe(true);
    expect(wantsHelpFlag(['-h'])).toBe(true);
    expect(wantsHelpFlag(['scan', '--help'])).toBe(true);
    expect(wantsHelpFlag(['scan'])).toBe(false);
  });

  it('resolves help topics', () => {
    expect(resolveHelpRequest(['help']).topic).toBe('overview');
    expect(resolveHelpRequest(['help', 'scan']).topic).toBe('scan');
    expect(resolveHelpRequest(['scan', '--help']).topic).toBe('scan');
    expect(resolveHelpRequest(['--help']).isHelp).toBe(true);
    expect(resolveHelpRequest(['scan']).isHelp).toBe(false);
  });

  it('knows valid subcommands', () => {
    expect(isKnownSubcommand('scan')).toBe(true);
    expect(isKnownSubcommand('enrich')).toBe(true);
    expect(isKnownSubcommand('scna')).toBe(false);
  });

  it('suggests close subcommand names', () => {
    expect(suggestSubcommand('scna')).toBe('scan');
    expect(suggestSubcommand('enrch')).toBe('enrich');
    expect(suggestSubcommand('zzzz')).toBeUndefined();
  });

  it('prints overview help without throwing', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printCliHelp('overview');
    expect(spy.mock.calls.length).toBeGreaterThan(5);
    spy.mockRestore();
  });

  it('exits on unknown subcommand', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as typeof process.exit);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => assertKnownSubcommand(['scna'])).toThrow('exit');
    expect(error.mock.calls.some(call => String(call[0]).includes('Unknown command'))).toBe(true);

    exit.mockRestore();
    error.mockRestore();
  });
});
