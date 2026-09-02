import { describe, expect, it, beforeEach } from 'vitest';
import {
  blankCanvasEntityRefFromName,
  clearBlankCanvasSession,
  persistBlankCanvasSession,
  readBlankCanvasSession,
  shouldRestoreBlankCanvasForUrl,
} from './blankCanvasSession';

describe('blankCanvasSession', () => {
  beforeEach(() => {
    clearBlankCanvasSession();
  });

  it('slugs a display name into a workspace entity ref', () => {
    expect(blankCanvasEntityRefFromName('Super amazing')).toBe('super-amazing');
  });

  it('round-trips a saved session', () => {
    persistBlankCanvasSession({
      filePath: 'super_amazing.yaml',
      entityRef: 'super-amazing',
      name: 'Super amazing',
    });
    expect(readBlankCanvasSession()).toEqual({
      filePath: 'super_amazing.yaml',
      entityRef: 'super-amazing',
      name: 'Super amazing',
    });
  });

  it('restores empty-workspace and the persisted named URL, not unrelated deep links', () => {
    const session = {
      filePath: 'super_amazing.yaml',
      entityRef: 'super-amazing',
      name: 'Super amazing',
    };
    expect(shouldRestoreBlankCanvasForUrl({ urlEntityRef: 'empty-workspace', session: null })).toBe(
      true
    );
    expect(shouldRestoreBlankCanvasForUrl({ urlEntityRef: 'super-amazing', session })).toBe(true);
    expect(shouldRestoreBlankCanvasForUrl({ urlEntityRef: 'golden-journey', session })).toBe(false);
  });
});
