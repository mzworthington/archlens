import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { EMPTY_MAP_MESSAGE } from '../../copy';
import { projectDiagram, tryParseBlueprint } from './openMap';
import { renderPreviewDocument } from './renderPreview';

const checkoutYaml = `version: https://archlens.dev/schemas/v4/blueprint.schema.json
level: context
metadata:
  entityRef: checkout
  name: Checkout
nodes:
  - entityRef: checkout/api
    type: software-system
    name: Checkout API
  - entityRef: checkout/billing
    type: software-system
    name: Billing
dependencies:
  - from: checkout/api
    to: checkout/billing
    type: direct-call
`;

function mount(html: string): Document {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
  return dom.window.document;
}

describe('renderPreviewDocument', () => {
  it('shows systems, links, and the focused system name and entityRef', () => {
    const schema = tryParseBlueprint(checkoutYaml);
    if (!schema) throw new Error('expected a blueprint');
    const view = projectDiagram(schema, '/repo/blueprints/context.yaml');
    const document = mount(renderPreviewDocument({ kind: 'diagram', view }, 'nonce-1'));
    const buttons = [...document.querySelectorAll('button')];
    expect(buttons.map(button => button.textContent)).toEqual(['Checkout API', 'Billing']);
    expect(document.querySelector('[aria-label="Links"]')?.textContent).toContain(
      'Checkout API to Billing'
    );
    const checkout = buttons[0];
    if (!checkout) throw new Error('expected Checkout API');
    checkout.focus();
    expect(document.activeElement).toBe(checkout);
    expect(document.activeElement?.textContent).toBe('Checkout API');
    expect(document.getElementById('prop-name')?.textContent).toBe('Checkout API');
    expect(document.getElementById('prop-entity-ref')?.textContent).toBe('checkout/api');
  });

  it('shows an empty preview with no systems', () => {
    const document = mount(renderPreviewDocument({ kind: 'empty' }, 'nonce-1'));
    expect(document.body.textContent).toContain(EMPTY_MAP_MESSAGE);
    expect(document.querySelectorAll('button')).toHaveLength(0);
  });

  it('escapes system names so the preview cannot run markup from the file', () => {
    const schema = tryParseBlueprint(
      checkoutYaml.replace('name: Billing', 'name: "</script><img src=x>"')
    );
    if (!schema) throw new Error('expected a blueprint');
    const html = renderPreviewDocument(
      { kind: 'diagram', view: projectDiagram(schema, '/repo/context.yaml') },
      'nonce-1'
    );
    expect(html).not.toContain('</script><img');
    expect(html).toContain('&lt;/script&gt;&lt;img src=x&gt;');
    const document = mount(html);
    expect(document.querySelector('img')).toBeNull();
    expect(document.body.textContent).toContain('</script><img src=x>');
  });

  it('allows only the preview nonce in the content security policy', () => {
    const html = renderPreviewDocument({ kind: 'empty' }, 'nonce-1');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src 'nonce-nonce-1'");
    expect(html).not.toContain('unsafe-inline');
  });
});
