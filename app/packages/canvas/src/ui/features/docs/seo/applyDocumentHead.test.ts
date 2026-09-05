import { afterEach, describe, expect, it } from 'vitest';
import { applyDocumentHead, resetDocumentHeadManagedNodes } from './applyDocumentHead';
import { resolvePageSeo } from './siteSeo';

describe('applyDocumentHead', () => {
  afterEach(() => {
    resetDocumentHeadManagedNodes();
    document.title = '';
    document.head.querySelectorAll('[data-archlens-seo]').forEach(node => node.remove());
    document.head.querySelector('link[rel="canonical"]')?.remove();
  });

  it('updates title, description, canonical, robots and social tags', () => {
    applyDocumentHead(resolvePageSeo('/guide/chaoslens'));

    expect(document.title.toLowerCase()).toContain('chaoslens');
    expect(
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute('content')
        ?.toLowerCase()
    ).toContain('chaos');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://archlens.dev/guide/chaoslens'
    );
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      document.title
    );
    expect(
      document.head.querySelector('meta[property="og:url"]')?.getAttribute('href') ||
        document.head.querySelector('meta[property="og:url"]')?.getAttribute('content')
    ).toBe('https://archlens.dev/guide/chaoslens');
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'index,follow'
    );
  });

  it('sets noindex for workspace and replaces prior JSON-LD', () => {
    applyDocumentHead(resolvePageSeo('/guide/chaoslens'));
    expect(document.head.querySelectorAll('script[type="application/ld+json"]').length).toBe(1);

    applyDocumentHead(resolvePageSeo('/workspace'));
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex,nofollow'
    );
    expect(document.head.querySelectorAll('script[type="application/ld+json"]').length).toBe(0);
  });
});
