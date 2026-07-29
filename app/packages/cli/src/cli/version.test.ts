import { afterEach, describe, expect, it, vi } from 'vitest';
import { getArchlensVersion, isCompiledRelease, wantsVersionFlag } from './version.ts';

vi.mock('./buildVersion.generated.ts', () => ({
  ARCHLENS_BUILD_VERSION: 'v0.1.5',
}));

describe('version', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('returns embedded build version', () => {
    expect(getArchlensVersion()).toBe('v0.1.5');
    expect(isCompiledRelease()).toBe(true);
  });

  it('detects --version and -V', () => {
    expect(wantsVersionFlag(['--version'])).toBe(true);
    expect(wantsVersionFlag(['-V'])).toBe(true);
    expect(wantsVersionFlag(['--headless'])).toBe(false);
  });
});

describe('version (dev build)', () => {
  it('treats dev as non-release', async () => {
    vi.doUnmock('./buildVersion.generated.ts');
    vi.resetModules();
    vi.doMock('./buildVersion.generated.ts', () => ({
      ARCHLENS_BUILD_VERSION: 'dev',
    }));
    const { getArchlensVersion, isCompiledRelease } = await import('./version.ts');
    expect(getArchlensVersion()).toBe('dev');
    expect(isCompiledRelease()).toBe(false);
  });
});
