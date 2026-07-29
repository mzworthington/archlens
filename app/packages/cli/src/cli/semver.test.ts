import { describe, expect, it } from 'vitest';
import { compareSemVer, isNewerVersion, parseSemVer } from './semver.ts';

describe('semver', () => {
  it('parses v-prefixed tags', () => {
    expect(parseSemVer('v0.1.5')).toEqual({ major: 0, minor: 1, patch: 5 });
  });

  it('compares patch versions', () => {
    expect(compareSemVer('v0.1.6', 'v0.1.5')).toBe(1);
    expect(compareSemVer('v0.1.5', 'v0.1.6')).toBe(-1);
    expect(compareSemVer('v0.1.5', 'v0.1.5')).toBe(0);
  });

  it('detects newer versions', () => {
    expect(isNewerVersion('v0.2.0', 'v0.1.99')).toBe(true);
    expect(isNewerVersion('v0.1.5', 'v0.1.5')).toBe(false);
  });
});
