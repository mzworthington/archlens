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
      placement: 'file',
    });
    expect(readBlankCanvasSession()).toEqual({
      filePath: 'super_amazing.yaml',
      entityRef: 'super-amazing',
      name: 'Super amazing',
      placement: 'file',
    });
  });

  it('treats a legacy session without placement as unsaved when it is still the starter file', () => {
    localStorage.setItem(
      'archlens.blankCanvas.session',
      JSON.stringify({
        filePath: 'blueprint.yaml',
        entityRef: 'empty-workspace',
        name: 'Empty Workspace',
      })
    );
    expect(readBlankCanvasSession()?.placement).toBe('unsaved');
  });

  it('restores empty-workspace and the persisted named URL, not unrelated deep links', () => {
    const session = {
      filePath: 'super_amazing.yaml',
      entityRef: 'super-amazing',
      name: 'Super amazing',
      placement: 'file' as const,
    };
    expect(shouldRestoreBlankCanvasForUrl({ urlEntityRef: 'empty-workspace', session: null })).toBe(
      true
    );
    expect(shouldRestoreBlankCanvasForUrl({ urlEntityRef: 'super-amazing', session })).toBe(true);
    expect(shouldRestoreBlankCanvasForUrl({ urlEntityRef: 'golden-journey', session })).toBe(false);
  });
});
