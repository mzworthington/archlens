import { describe, it, expect } from 'vitest';
import { resolveContextDisplayName, resolveSystemEntityRef } from './entityRefContext.ts';

describe('entityRefContext', () => {
  it('maps known context slugs to display titles', () => {
    expect(resolveContextDisplayName('backstage')).toBe('Backstage');
    expect(resolveContextDisplayName('infrastructure')).toBe('Infrastructure Examples');
  });

  it('avoids duplicate segments when system id matches the context root', () => {
    expect(resolveSystemEntityRef('eshop', 'eshop')).toBe('eshop');
    expect(resolveSystemEntityRef('backstage', 'plugins')).toBe('backstage/plugins');
    expect(resolveSystemEntityRef('application', 'gpio-build-monitor')).toBe(
      'application/gpio-build-monitor'
    );
  });
});
