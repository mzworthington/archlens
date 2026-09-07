import { buildJsonLdGraph, type PageSeo } from './siteSeo';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function replaceMetaContent(
  html: string,
  attr: 'name' | 'property',
  key: string,
  content: string
): string {
  const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`, 'i');
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}

function upsertCanonical(html: string, href: string): string {
  const tag = `<link rel="canonical" href="${escapeHtml(href)}" />`;
  if (/<link\s+rel="canonical"/i.test(html)) {
    return html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, tag);
  }
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}

function upsertRobots(html: string, content: string): string {
  return replaceMetaContent(html, 'name', 'robots', content);
}

function stripJsonLdScripts(html: string): string {
  // indexOf scan - avoids incomplete multi-character sanitization / nested <script> leftovers.
  let result = '';
  let i = 0;
  const lower = html.toLowerCase();

  while (i < html.length) {
    const open = lower.indexOf('<script', i);
    if (open === -1) {
      result += html.slice(i);
      break;
    }

    const tagEnd = html.indexOf('>', open);
    if (tagEnd === -1) {
      result += html.slice(i);
      break;
    }

    const openTag = html.slice(open, tagEnd + 1);
    if (!/\btype\s*=\s*["']application\/ld\+json["']/i.test(openTag)) {
      result += html.slice(i, tagEnd + 1);
      i = tagEnd + 1;
      continue;
    }

    result += html.slice(i, open);
    const close = lower.indexOf('</script>', tagEnd + 1);
    if (close === -1) {
      break;
    }
    i = close + '</script>'.length;
    while (
      i < html.length &&
      (html[i] === ' ' || html[i] === '\t' || html[i] === '\n' || html[i] === '\r')
    ) {
      i++;
    }
  }

  return result;
}

function upsertJsonLd(html: string, seo: PageSeo): string {
  const without = stripJsonLdScripts(html);
  if (!seo.indexable) return without;
  const script = `<script type="application/ld+json">${JSON.stringify(buildJsonLdGraph(seo.path))}</script>`;
  return without.replace(/<\/head>/i, `    ${script}\n  </head>`);
}

function prerenderBody(seo: PageSeo, navLinks: Array<{ href: string; label: string }>): string {
  const links = navLinks
    .map(
      link => `        <li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`
    )
    .join('\n');

  return `      <main data-archlens-prerender="1">
        <h1>${escapeHtml(seo.headline)}</h1>
        <p>${escapeHtml(seo.description)}</p>
        <nav aria-label="ArchLens products">
          <ul>
${links}
          </ul>
        </nav>
      </main>
`;
}

/**
 * Rewrite the Vite SPA shell for a specific public path so crawlers receive
 * correct head tags and readable body content before JavaScript executes.
 */
export function injectPrerenderedPageHtml(
  shellHtml: string,
  seo: PageSeo,
  navLinks: Array<{ href: string; label: string }>
): string {
  let html = shellHtml;
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`);
  html = replaceMetaContent(html, 'name', 'description', seo.description);
  html = upsertRobots(html, seo.indexable ? 'index,follow' : 'noindex,nofollow');
  html = upsertCanonical(html, seo.canonicalUrl);
  html = replaceMetaContent(html, 'property', 'og:url', seo.canonicalUrl);
  html = replaceMetaContent(html, 'property', 'og:title', seo.title);
  html = replaceMetaContent(html, 'property', 'og:description', seo.description);
  html = replaceMetaContent(html, 'property', 'og:image', seo.ogImageUrl);
  html = replaceMetaContent(html, 'name', 'twitter:url', seo.canonicalUrl);
  html = replaceMetaContent(html, 'name', 'twitter:title', seo.title);
  html = replaceMetaContent(html, 'name', 'twitter:description', seo.description);
  html = replaceMetaContent(html, 'name', 'twitter:image', seo.ogImageUrl);
  html = upsertJsonLd(html, seo);

  const body = prerenderBody(seo, navLinks);
  if (/<div id="root"><\/div>/i.test(html)) {
    html = html.replace(/<div id="root"><\/div>/i, `<div id="root">\n${body}    </div>`);
  } else if (/<div id="root">[\s\S]*?<\/div>/i.test(html)) {
    html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">\n${body}    </div>`);
  }

  return html;
}
