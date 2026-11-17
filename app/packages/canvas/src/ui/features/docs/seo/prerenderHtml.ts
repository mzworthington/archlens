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

/**
 * Critical CSS for the SEO shell. Inline so the first paint is branded before the
 * Vite CSS bundle arrives. Sighted users with JS see this briefly, then React
 * replaces `#root`. Crawlers keep the semantic H1 / description / nav.
 */
function prerenderCriticalCss(): string {
  return `<style data-archlens-prerender-css>
  [data-archlens-prerender]{
    box-sizing:border-box;
    min-height:100dvh;
    margin:0;
    padding:clamp(1.5rem,4vw,3rem);
    font-family:"Plus Jakarta Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    color:#152033;
    background:
      radial-gradient(ellipse 80% 50% at 50% -20%,rgba(12,107,120,.12),transparent),
      #e8eef3;
  }
  [data-archlens-prerender] *{box-sizing:border-box}
  [data-archlens-prerender] .al-prerender-eyebrow{
    margin:0 0 .75rem;
    font-family:"JetBrains Mono",ui-monospace,monospace;
    font-size:10px;
    letter-spacing:.16em;
    text-transform:uppercase;
    color:#0c6b78;
  }
  [data-archlens-prerender] h1{
    margin:0;
    max-width:40rem;
    font-size:clamp(1.75rem,4vw,2.75rem);
    line-height:1.1;
    font-weight:800;
    letter-spacing:-.02em;
    color:#152033;
  }
  [data-archlens-prerender] .al-prerender-lede{
    margin:1rem 0 0;
    max-width:40rem;
    font-size:clamp(1rem,2.2vw,1.125rem);
    line-height:1.55;
    color:rgba(21,32,51,.72);
  }
  [data-archlens-prerender] nav{
    margin-top:1.75rem;
  }
  [data-archlens-prerender] nav ul{
    display:flex;
    flex-wrap:wrap;
    gap:.5rem .75rem;
    margin:0;
    padding:0;
    list-style:none;
  }
  [data-archlens-prerender] nav a{
    display:inline-flex;
    align-items:center;
    border:1px solid rgba(12,107,120,.35);
    border-radius:.75rem;
    padding:.55rem .9rem;
    font-size:.8125rem;
    font-weight:600;
    color:#0c6b78;
    text-decoration:none;
    background:rgba(255,255,255,.7);
  }
  /* Drop the throwaway shell from layout, tab order, and the accessibility tree
     once boot starts. display:none also beats min-height:100dvh. Non-JS crawlers
     never set the attribute. A failed module clears it so this markup is visible. */
  html[data-archlens-booting="1"] [data-archlens-prerender]{
    display:none !important;
    min-height:0 !important;
  }
</style>`;
}

function prerenderBootScript(): string {
  // Runs before the module graph so users do not see the SEO shell flash.
  // Crawlers that skip scripts still receive the visible branded markup above.
  // If that module never replaces #root, clear the flag so the shell is the fallback.
  return `<script data-archlens-prerender-boot>
(function(){
  try{
    var doc=document.documentElement;
    doc.setAttribute("data-archlens-booting","1");
    var reveal=function(){
      if(document.querySelector("[data-archlens-prerender]")) doc.removeAttribute("data-archlens-booting");
    };
    window.addEventListener("error",function(event){
      var target=event.target;
      if((target&&target.tagName==="SCRIPT")||event.error) reveal();
    },true);
  }catch(e){}
})();
</script>`;
}

function prerenderBody(seo: PageSeo, navLinks: Array<{ href: string; label: string }>): string {
  const links = navLinks
    .map(
      link => `          <li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`
    )
    .join('\n');

  return `      <main data-archlens-prerender="1" aria-label="ArchLens">
        <p class="al-prerender-eyebrow">ArchLens</p>
        <h1>${escapeHtml(seo.headline)}</h1>
        <p class="al-prerender-lede">${escapeHtml(seo.description)}</p>
        <nav aria-label="ArchLens products">
          <ul>
${links}
          </ul>
        </nav>
      </main>
`;
}

function upsertPrerenderAssets(html: string): string {
  let next = html;
  if (!/data-archlens-prerender-css/i.test(next)) {
    next = next.replace(/<\/head>/i, `    ${prerenderCriticalCss()}\n  </head>`);
  }
  if (!/data-archlens-prerender-boot/i.test(next)) {
    // Boot script first in body so booting attr lands before paint when possible.
    next = next.replace(/<body([^>]*)>/i, `<body$1>\n    ${prerenderBootScript()}`);
  }
  return next;
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
  html = upsertPrerenderAssets(html);

  const body = prerenderBody(seo, navLinks);
  if (/<div id="root"><\/div>/i.test(html)) {
    html = html.replace(/<div id="root"><\/div>/i, `<div id="root">\n${body}    </div>`);
  } else if (/<div id="root">[\s\S]*?<\/div>/i.test(html)) {
    html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">\n${body}    </div>`);
  }

  return html;
}
