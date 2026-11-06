import { describe, expect, it } from 'vitest';
import { EMPTY_MAP_COPY } from './domain';
import { renderEmptyMap, renderMap } from './renderMap';

describe('architecture map panel', () => {
  it('names each system so keyboard focus lands on that name', () => {
    const html = renderMap(
      {
        sourcePath: '/repo/blueprints/context.yaml',
        systems: [
          { name: 'Checkout API', entityRef: 'checkout/api' },
          { name: 'Billing', entityRef: 'checkout/billing' },
        ],
        links: [{ fromName: 'Checkout API', toName: 'Billing' }],
      },
      'nonce-1'
    );

    expect(html).toContain('aria-label="Checkout API"');
    expect(html).toContain('data-entity-ref="checkout/api"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('<dd>checkout/api</dd>');
    expect(html).toContain('Checkout API → Billing');
    expect(html).toContain(`script nonce="nonce-1"`);
    expect(html).toContain("script-src 'nonce-nonce-1'");
    expect(html).toContain("event.key !== 'Enter'");
    expect(html).toContain("event.key !== 'ArrowLeft'");
    expect(html).not.toContain('onclick');
  });

  it('escapes a system name before putting it in the panel', () => {
    const html = renderMap(
      {
        sourcePath: '/repo/blueprints/context.yaml',
        systems: [{ name: '<img onerror="alert(1)">', entityRef: 'checkout/api' }],
        links: [],
      },
      'nonce-1'
    );

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img onerror=&quot;alert(1)&quot;&gt;');
  });

  it('shows the empty sentence and no systems', () => {
    const html = renderEmptyMap();

    expect(html).toContain(EMPTY_MAP_COPY);
    expect(html).not.toContain('<article');
  });
});
