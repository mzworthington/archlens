import { describe, expect, it, vi } from 'vitest';
import { buildWatchIgnorePatterns, createDebouncer } from './watchMode.ts';
import { parseArchlensArgv } from '../parseArchlensArgv.ts';

describe('buildWatchIgnorePatterns', () => {
  it('ignores blueprint output directory relative to scan root', () => {
    const patterns = buildWatchIgnorePatterns('/repo', 'blueprints');
    expect(patterns).toContain('blueprints/**');
    expect(patterns).toContain('**/node_modules/**');
  });

  it('ignores absolute output outside scan root', () => {
    const patterns = buildWatchIgnorePatterns('/repo', '/tmp/out');
    expect(patterns.some(pattern => pattern.includes('/tmp/out'))).toBe(true);
  });
});

describe('createDebouncer', () => {
  it('coalesces rapid calls', async () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const debouncer = createDebouncer(run, 200);

    debouncer.schedule();
    debouncer.schedule();
    debouncer.schedule();

    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(199);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(1);

    debouncer.cancel();
    debouncer.schedule();
    await vi.advanceTimersByTimeAsync(200);
    expect(run).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});

describe('parseArchlensArgv watch flags', () => {
  it('parses --watch and --watch-debounce', () => {
    const plan = parseArchlensArgv([
      '--headless',
      '--watch',
      '--watch-debounce=750',
      '--output=blueprints',
    ]);
    expect(plan.watch).toBe(true);
    expect(plan.watchDebounceMs).toBe(750);
    expect(plan.isHeadless).toBe(true);
  });
});
