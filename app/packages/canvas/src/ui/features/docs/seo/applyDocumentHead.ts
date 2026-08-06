import { buildJsonLdGraph, type PageSeo } from './siteSeo';

const SEO_ATTR = 'data-archlens-seo';

function upsertMeta(attr: 'name' | 'property', key: string, content: string): HTMLMetaElement {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute(SEO_ATTR, '1');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
  return el;
}

function upsertLink(rel: string, href: string): HTMLLinkElement {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    el.setAttribute(SEO_ATTR, '1');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  return el;
}

function upsertJsonLd(seo: PageSeo): void {
  document.head
    .querySelectorAll(`script[type="application/ld+json"][${SEO_ATTR}]`)
    .forEach(node => node.remove());

  if (!seo.indexable) return;

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute(SEO_ATTR, '1');
  script.textContent = JSON.stringify(buildJsonLdGraph(seo.path));
  document.head.appendChild(script);
}

/** Remove nodes created by prior applyDocumentHead calls (tests / remounts). */
export function resetDocumentHeadManagedNodes(): void {
  document.head.querySelectorAll(`[${SEO_ATTR}]`).forEach(node => node.remove());
}

/** Apply route SEO to `document.head` (titles, social tags, canonical, JSON-LD). */
export function applyDocumentHead(seo: PageSeo): void {
  document.title = seo.title;
  upsertMeta('name', 'description', seo.description);
  upsertMeta('name', 'robots', seo.indexable ? 'index,follow' : 'noindex,nofollow');
  upsertLink('canonical', seo.canonicalUrl);

  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:url', seo.canonicalUrl);
  upsertMeta('property', 'og:title', seo.title);
  upsertMeta('property', 'og:description', seo.description);
  upsertMeta('property', 'og:image', seo.ogImageUrl);

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:url', seo.canonicalUrl);
  upsertMeta('name', 'twitter:title', seo.title);
  upsertMeta('name', 'twitter:description', seo.description);
  upsertMeta('name', 'twitter:image', seo.ogImageUrl);

  upsertJsonLd(seo);
}
