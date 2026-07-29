import { describe, expect, it, vi } from 'vitest';
import {
  UPDATE_CHECK_TTL_MS,
  checkForUpdate,
  resolveLatestTag,
  shouldCheckForUpdates,
} from './updateCheck.ts';

describe('shouldCheckForUpdates', () => {
  it('checks only interactive release binaries', () => {
    expect(
      shouldCheckForUpdates({
        argv: [],
        isCompiledRelease: true,
        isHeadless: false,
        isInteractiveTty: true,
        isCi: false,
        skipUpdateCheckFlag: false,
        isUpdateSubcommand: false,
      })
    ).toBe(true);

    expect(
      shouldCheckForUpdates({
        argv: ['--headless'],
        isCompiledRelease: true,
        isHeadless: true,
        isInteractiveTty: true,
        isCi: false,
        skipUpdateCheckFlag: false,
        isUpdateSubcommand: false,
      })
    ).toBe(false);

    expect(
      shouldCheckForUpdates({
        argv: ['--no-update-check'],
        isCompiledRelease: true,
        isHeadless: false,
        isInteractiveTty: true,
        isCi: false,
        skipUpdateCheckFlag: true,
        isUpdateSubcommand: false,
      })
    ).toBe(false);
  });
});

describe('resolveLatestTag', () => {
  it('uses cache when fresh', async () => {
    const fetchLatestTag = vi.fn(async () => 'v9.9.9');
    const writeCache = vi.fn();
    const now = Date.now();

    const latest = await resolveLatestTag({
      now: () => now,
      readCache: () => ({ checkedAt: new Date(now - 1000).toISOString(), latestTag: 'v0.1.8' }),
      writeCache,
      fetchLatestTag,
    });

    expect(latest).toBe('v0.1.8');
    expect(fetchLatestTag).not.toHaveBeenCalled();
    expect(writeCache).not.toHaveBeenCalled();
  });

  it('refreshes stale cache', async () => {
    const fetchLatestTag = vi.fn(async () => 'v0.1.9');
    const writeCache = vi.fn();
    const now = Date.now();

    const latest = await resolveLatestTag({
      now: () => now,
      readCache: () => ({
        checkedAt: new Date(now - UPDATE_CHECK_TTL_MS - 1).toISOString(),
        latestTag: 'v0.1.8',
      }),
      writeCache,
      fetchLatestTag,
    });

    expect(latest).toBe('v0.1.9');
    expect(writeCache).toHaveBeenCalledWith({
      checkedAt: new Date(now).toISOString(),
      latestTag: 'v0.1.9',
    });
  });
});

describe('checkForUpdate', () => {
  it('returns null when already on latest', async () => {
    const result = await checkForUpdate('v0.1.5', {
      fetchLatestTag: async () => 'v0.1.5',
    });
    expect(result).toBeNull();
  });

  it('returns availability when newer release exists', async () => {
    const result = await checkForUpdate('v0.1.4', {
      fetchLatestTag: async () => 'v0.1.5',
    });
    expect(result).toEqual({ current: 'v0.1.4', latest: 'v0.1.5' });
  });
});
