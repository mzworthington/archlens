import { describe, expect, it, beforeEach } from 'vitest';
import {
  blankCanvasEntityRefFromName,
  clearBlankCanvasSession,
  persistBlankCanvasSession,
  readBlankCanvasSession,
  shouldRestoreBlankCanvasForUrl,
} from './blankCanvasSession';

const namedSession = {
  filePath: 'super_amazing.yaml',
  entityRef: 'super-amazing',
  name: 'Super amazing',
  placement: 'file' as const,
};

describe('blankCanvasSession', () => {
  beforeEach(() => {
    clearBlankCanvasSession();
  });

  it('slugs a display name into a workspace entity ref', () => {
    expect(blankCanvasEntityRefFromName('Super amazing')).toBe('super-amazing');
  });

  it('avoids the reserved Samples catalog slug for a blank workspace named Samples', () => {
    expect(blankCanvasEntityRefFromName('Samples')).toBe('samples-workspace');
  });

  it('round-trips a saved session', () => {
    persistBlankCanvasSession(namedSession);
    expect(readBlankCanvasSession()).toEqual(namedSession);
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

  it('restores the blank session, including a create-zoom child, and ignores other deep links', () => {
    expect(shouldRestoreBlankCanvasForUrl({ urlEntityRef: 'empty-workspace', session: null })).toBe(
      true
    );
    expect(
      shouldRestoreBlankCanvasForUrl({ urlEntityRef: 'super-amazing', session: namedSession })
    ).toBe(true);
    expect(
      shouldRestoreBlankCanvasForUrl({
        urlEntityRef: 'super-amazing/software-system-1204',
        session: namedSession,
      })
    ).toBe(true);
    expect(
      shouldRestoreBlankCanvasForUrl({
        urlEntityRef: 'empty-workspace/software-system-1204',
        session: null,
      })
    ).toBe(true);
    expect(
      shouldRestoreBlankCanvasForUrl({
        urlEntityRef: 'super-amazing-extra',
        session: namedSession,
      })
    ).toBe(false);
    expect(
      shouldRestoreBlankCanvasForUrl({ urlEntityRef: 'golden-journey', session: namedSession })
    ).toBe(false);
    expect(
      shouldRestoreBlankCanvasForUrl({
        urlEntityRef: 'golden-journey/checkout',
        session: namedSession,
      })
    ).toBe(false);
  });

  it('does not claim bundled Samples deep-links when a blank session reused the samples slug', () => {
    const samplesSession = {
      filePath: 'samples.yaml',
      entityRef: 'samples',
      name: 'Samples',
      placement: 'unsaved' as const,
    };
    expect(
      shouldRestoreBlankCanvasForUrl({
        urlEntityRef: 'samples',
        session: samplesSession,
      })
    ).toBe(true);
    expect(
      shouldRestoreBlankCanvasForUrl({
        urlEntityRef: 'samples/software-system-1204',
        session: samplesSession,
      })
    ).toBe(true);
    expect(
      shouldRestoreBlankCanvasForUrl({
        urlEntityRef: 'samples/golden-journey',
        session: samplesSession,
      })
    ).toBe(false);
    expect(
      shouldRestoreBlankCanvasForUrl({
        urlEntityRef: 'samples/golden-journey/checkout',
        session: samplesSession,
      })
    ).toBe(false);
  });
});
