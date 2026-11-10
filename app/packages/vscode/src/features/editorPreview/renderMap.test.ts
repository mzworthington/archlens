import { describe, expect, it } from 'vitest';
import { EMPTY_MAP_COPY } from './domain';
import { renderCanvasShell, renderEmptyMap, renderMap } from './renderMap';

describe('architecture map panel', () => {
  it('names each system so keyboard focus lands on that name', () => {
    const html = renderMap(
      {
        sourcePath: '/repo/blueprints/context.yaml',
        level: 'context',
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
    expect(html).not.toContain('Hotspot');
  });

  it('draws the website canvas so a node can be dragged and the link follows it', () => {
    const html = renderMap(
      {
        sourcePath: '/repo/blueprints/context.yaml',
        level: 'context',
        systems: [
          {
            name: 'Checkout API',
            entityRef: 'checkout/api',
            type: 'software-system',
            position: { x: 40, y: 48 },
          },
          {
            name: 'Billing',
            entityRef: 'checkout/billing',
            type: 'database',
            external: true,
            position: { x: 360, y: 48 },
          },
        ],
        links: [
          {
            fromName: 'Checkout API',
            toName: 'Billing',
            fromRef: 'checkout/api',
            toRef: 'checkout/billing',
          },
        ],
      },
      'nonce-1'
    );

    expect(html).toContain('data-canvas="architecture"');
    expect(html).toContain('#334155');
    expect(html).toContain('#020617');
    expect(html).toContain('width:256px');
    expect(html).toContain('left:40px');
    expect(html).toContain('top:48px');
    expect(html).toContain('rgba(59, 130, 246, 0.3)');
    expect(html).toContain('rgba(244, 63, 94, 0.3)');
    expect(html).toContain('data-external="true"');
    expect(html).toContain('border-style:dashed');
    expect(html).toContain('data-from="checkout/api"');
    expect(html).toContain('data-to="checkout/billing"');
    expect(html).toContain('x1="296"');
    expect(html).toContain('x2="360"');
    expect(html).toContain('pointerdown');
    expect(html).not.toContain('<ul>');
  });

  it('hosts the workspace canvas and gives it the blueprint', () => {
    const html = renderCanvasShell({
      yaml: 'name: Checkout API\n',
      hotspots: true,
      nonce: 'nonce-1',
      scriptSrc: 'https://webview/canvas-preview.js',
      styleSrc: 'https://webview/canvas-preview.css',
      cspSource: 'https://webview',
    });

    expect(html).toContain('https://webview/canvas-preview.js');
    expect(html).toContain('https://webview/canvas-preview.css');
    expect(html).toContain('id="blueprint"');
    expect(html).toContain('name: Checkout API');
    expect(html).toContain('data-hotspots="on"');
    expect(html).toContain(`script-src 'nonce-nonce-1'`);
    expect(html).not.toContain('<article');
  });

  it('shows a hotspot mark and a change count on a marked system', () => {
    const html = renderMap(
      {
        sourcePath: '/repo/blueprints/context.yaml',
        level: 'context',
        systems: [
          { name: 'Checkout API', entityRef: 'checkout/api', hotspotCount: 6 },
          { name: 'Billing', entityRef: 'checkout/billing' },
        ],
        links: [],
      },
      'nonce-1'
    );

    expect(html).toContain('<p>Hotspot</p>');
    expect(html).toContain('<dt>Changes</dt>');
    expect(html).toContain('<dd>6</dd>');
    expect(html.match(/<p>Hotspot<\/p>/g)).toHaveLength(1);
  });

  it('escapes a system name before putting it in the panel', () => {
    const html = renderMap(
      {
        sourcePath: '/repo/blueprints/context.yaml',
        level: 'context',
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
