import { describe, expect, it } from 'vitest';
import { injectPrerenderedPageHtml } from './prerenderHtml';
import { resolvePageSeo } from './siteSeo';

const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>ArchLens - Codebase Map Explorer</title>
    <meta name="description" content="shell" />
    <meta property="og:url" content="https://archlens.dev/" />
    <meta property="og:title" content="ArchLens - Codebase Map Explorer" />
    <meta property="og:description" content="shell" />
    <meta property="og:image" content="https://archlens.dev/assets/logo-dark.png" />
    <meta name="twitter:url" content="https://archlens.dev/" />
    <meta name="twitter:title" content="ArchLens - Codebase Map Explorer" />
    <meta name="twitter:description" content="shell" />
    <meta name="twitter:image" content="https://archlens.dev/assets/logo-dark.png" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

describe('injectPrerenderedPageHtml', () => {
  it('rewrites head tags and injects crawlable body content inside #root', () => {
    const seo = resolvePageSeo('/guide/tracelens');
    const html = injectPrerenderedPageHtml(SHELL, seo, [
      { href: '/', label: 'ArchLens home' },
      { href: '/guide/chaoslens', label: 'ChaosLens' },
    ]);

    expect(html).toContain(`<title>${seo.title}</title>`);
    expect(html).toContain(`content="${seo.description}"`);
    expect(html).toContain(`href="${seo.canonicalUrl}"`);
    expect(html).toContain(seo.ogImageUrl);
    expect(html).toContain('application/ld+json');
    expect(html).toContain('id="root"');
    expect(html).toContain(`<h1>${seo.headline}</h1>`);
    expect(html).toContain(seo.description);
    expect(html).toContain('href="/guide/chaoslens"');
    expect(html).toContain('ArchLens home');
  });
});
