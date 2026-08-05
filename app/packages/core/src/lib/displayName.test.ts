import { describe, expect, it } from 'vitest';
import { displayNameFromEntityRef, preferDisplayName, resolveDisplayName } from './displayName';

describe('displayNameFromEntityRef', () => {
  it('title-cases the entityRef leaf', () => {
    expect(displayNameFromEntityRef('acme/checkout')).toBe('Checkout');
    expect(displayNameFromEntityRef('gpio-build-monitor')).toBe('Gpio Build Monitor');
    expect(displayNameFromEntityRef('archlens/blueprint-catalog-r2')).toBe('Blueprint Catalog R2');
  });
});

describe('resolveDisplayName', () => {
  it('keeps explicit names and derives when omitted', () => {
    expect(resolveDisplayName('E-Shop', 'eshop')).toBe('E-Shop');
    expect(resolveDisplayName(undefined, 'eshop')).toBe('Eshop');
    expect(resolveDisplayName('  ', 'acme/payment-gateway')).toBe('Payment Gateway');
  });
});

describe('preferDisplayName', () => {
  it('prefers explicit over derived and keeps the first explicit on conflict', () => {
    expect(preferDisplayName('Payments', 'Payments Platform', 'estate/payments')).toBe(
      'Payments Platform'
    );
    expect(preferDisplayName('Payments Platform', 'Payments', 'estate/payments')).toBe(
      'Payments Platform'
    );
    expect(preferDisplayName('Checkout Service', 'Checkout API', 'acme/checkout')).toBe(
      'Checkout Service'
    );
    expect(preferDisplayName(undefined, undefined, 'acme/checkout')).toBe('Checkout');
  });

  it('honors displayNameSource stamps when a curated name matches the derived form', () => {
    expect(
      preferDisplayName('Checkout', 'Checkout System', 'acme/checkout', {
        existingSource: 'explicit',
        incomingSource: 'derived',
      })
    ).toBe('Checkout');
  });
});
