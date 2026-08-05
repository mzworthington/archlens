import { describe, it, expect } from 'vitest';
import { buildTraceLensUrl, parseTraceLensUrl, isTraceLensUrl } from './traceLensUrl';

describe('traceLensUrl', () => {
  it('builds workspace lens URLs', () => {
    expect(buildTraceLensUrl()).toBe('/workspace?lens=tracelens');
    expect(buildTraceLensUrl(null)).toBe('/workspace?lens=tracelens');
    expect(buildTraceLensUrl('app/canvas/db')).toBe('/workspace/app/canvas/db?lens=tracelens');
    expect(buildTraceLensUrl('app/canvas', { planEntityRef: 'app/canvas/db' })).toBe(
      '/workspace/app/canvas?lens=tracelens&plan=app%2Fcanvas%2Fdb'
    );
    expect(buildTraceLensUrl('app/canvas/db', { showSource: true })).toBe(
      '/workspace/app/canvas/db?lens=tracelens&source=1'
    );
    expect(
      buildTraceLensUrl('app/canvas', {
        planEntityRef: 'app/canvas/db',
        showSource: true,
      })
    ).toBe('/workspace/app/canvas?lens=tracelens&plan=app%2Fcanvas%2Fdb&source=1');
  });

  it('parses workspace lens URLs', () => {
    expect(parseTraceLensUrl('/workspace', 'lens=tracelens')).toEqual({ showSource: false });
    expect(parseTraceLensUrl('/workspace/samples', 'lens=tracelens')).toEqual({
      entityRef: 'samples',
      showSource: false,
    });
    expect(parseTraceLensUrl('/workspace/app/canvas', 'lens=tracelens&plan=app/canvas/db')).toEqual(
      {
        entityRef: 'app/canvas',
        planEntityRef: 'app/canvas/db',
        showSource: false,
      }
    );
    expect(parseTraceLensUrl('/workspace/app/canvas/db', 'lens=tracelens&source=1')).toEqual({
      entityRef: 'app/canvas/db',
      showSource: true,
    });
  });

  it('detects workspace TraceLens routes', () => {
    expect(isTraceLensUrl('/workspace', 'lens=tracelens')).toBe(true);
    expect(isTraceLensUrl('/workspace/samples', 'lens=tracelens')).toBe(true);
    expect(isTraceLensUrl('/workspace/samples', '')).toBe(false);
    expect(isTraceLensUrl('/workspace', 'lens=tracelens&view=recommendations')).toBe(false);
    expect(isTraceLensUrl('/tracelens')).toBe(false);
  });
});
