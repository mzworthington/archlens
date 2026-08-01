import { describe, it, expect } from 'vitest';
import {
  buildTraceLensUrl,
  parseTraceLensUrl,
  redirectLegacyTraceLensUrl,
  isTraceLensUrl,
} from './traceLensUrl';

describe('traceLensUrl', () => {
  it('builds workspace lens URLs', () => {
    expect(buildTraceLensUrl()).toBe('/workspace?lens=tracelens');
    expect(buildTraceLensUrl(null)).toBe('/workspace?lens=tracelens');
    expect(buildTraceLensUrl('app/designer/db')).toBe('/workspace/app/designer/db?lens=tracelens');
    expect(buildTraceLensUrl('app/designer', { planEntityRef: 'app/designer/db' })).toBe(
      '/workspace/app/designer?lens=tracelens&plan=app%2Fdesigner%2Fdb'
    );
    expect(buildTraceLensUrl('app/designer/db', { showSource: true })).toBe(
      '/workspace/app/designer/db?lens=tracelens&source=1'
    );
    expect(buildTraceLensUrl(null, { view: 'recommendations' })).toBe(
      '/workspace?lens=tracelens&view=recommendations'
    );
    expect(
      buildTraceLensUrl('app/designer', {
        planEntityRef: 'app/designer/db',
        showSource: true,
      })
    ).toBe('/workspace/app/designer?lens=tracelens&plan=app%2Fdesigner%2Fdb&source=1');
  });

  it('parses workspace lens URLs', () => {
    expect(parseTraceLensUrl('/workspace', 'lens=tracelens')).toEqual({ showSource: false });
    expect(parseTraceLensUrl('/workspace/golden-paths', 'lens=tracelens')).toEqual({
      entityRef: 'golden-paths',
      showSource: false,
    });
    expect(
      parseTraceLensUrl('/workspace/app/designer', 'lens=tracelens&plan=app/designer/db')
    ).toEqual({
      entityRef: 'app/designer',
      planEntityRef: 'app/designer/db',
      showSource: false,
    });
    expect(parseTraceLensUrl('/workspace/app/designer/db', 'lens=tracelens&source=1')).toEqual({
      entityRef: 'app/designer/db',
      showSource: true,
    });
    expect(parseTraceLensUrl('/workspace', 'lens=tracelens&view=recommendations')).toEqual({
      showSource: false,
      view: 'recommendations',
    });
  });

  it('redirects legacy /tracelens paths', () => {
    expect(redirectLegacyTraceLensUrl('/tracelens')).toBe('/workspace?lens=tracelens');
    expect(redirectLegacyTraceLensUrl('/tracelens/app/designer', 'view=recommendations')).toBe(
      '/workspace/app/designer?lens=tracelens&view=recommendations'
    );
  });

  it('detects trace lens routes', () => {
    expect(isTraceLensUrl('/workspace', 'lens=tracelens')).toBe(true);
    expect(isTraceLensUrl('/workspace/golden-paths', 'lens=tracelens')).toBe(true);
    expect(isTraceLensUrl('/workspace/golden-paths', '')).toBe(false);
    expect(isTraceLensUrl('/tracelens')).toBe(true);
  });
});
