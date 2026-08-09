import { PRODUCT_HERO } from '../../../content/productOutcomes';

export const SITE_ORIGIN = 'https://archlens.dev';
export const SITE_NAME = 'ArchLens';
export const SITE_SOCIAL_IMAGE = `${SITE_ORIGIN}/assets/social-share.png`;

export type PageSeo = {
  path: string;
  title: string;
  /** Visible H1 / prerender heading (may omit site suffix). */
  headline: string;
  description: string;
  canonicalUrl: string;
  ogImageUrl: string;
  indexable: boolean;
  /** Optional SoftwareApplication name for JSON-LD product pages. */
  softwareName?: string;
};

type SeoOverride = {
  headline: string;
  description: string;
  title?: string;
  softwareName?: string;
  indexable?: boolean;
};

/** Canonical public SEO records — keep in sync with docs routes in `pages.ts`. */
const PAGE_SEO: Record<string, SeoOverride> = {
  '/': {
    headline: SITE_NAME,
    title: `${SITE_NAME} — Catch architecture risk before it becomes an outage`,
    description: `${PRODUCT_HERO.lede} Free open-source BlueprintSpec architecture studio with Canvas, TraceLens, ChaosLens, and AdviceLens.`,
    softwareName: SITE_NAME,
  },
  '/journeys': {
    headline: 'Interface tour & journeys',
    description:
      'Interactive ArchLens product tour: golden-journey demos for Canvas, TraceLens, ChaosLens, and AdviceLens architecture workflows.',
  },
  '/design-system': {
    headline: 'Design system',
    description:
      'ArchLens design system tokens, components, and patterns used across the Canvas product suite.',
    indexable: false,
  },
  '/guide': {
    headline: 'Product guide',
    description:
      'ArchLens product guide: BlueprintSpec architecture modeling with Canvas, ArchLens CLI, TraceLens, ChaosLens, and AdviceLens.',
  },
  '/guide/getting-started': {
    headline: 'Getting started with ArchLens',
    description:
      'Install ArchLens, generate BlueprintSpec YAML from your repo, and open diagrams in ArchLens Canvas in minutes.',
  },
  '/guide/canvas': {
    headline: 'ArchLens Canvas',
    title: 'ArchLens Canvas — Interactive C4 architecture diagrams | ArchLens',
    description:
      'ArchLens Canvas is a C4 architecture workspace over BlueprintSpec YAML — bi-directional diagram sync, local folders, and published estate catalogs.',
    softwareName: 'ArchLens Canvas',
  },
  '/guide/cli': {
    headline: 'ArchLens',
    title: 'ArchLens CLI — Codebase to BlueprintSpec architecture maps | ArchLens',
    description:
      'ArchLens scans source code, discovers systems and dependencies, and writes validated multi-level BlueprintSpec YAML architecture maps.',
    softwareName: 'ArchLens',
  },
  '/guide/tracelens': {
    headline: 'TraceLens',
    title: 'TraceLens — Code hotspot forensics on architecture diagrams | ArchLens',
    description:
      'TraceLens overlays git churn, complexity, temporal coupling, and blueprint dependency risk on ArchLens architecture diagrams.',
    softwareName: 'TraceLens',
  },
  '/guide/chaoslens': {
    headline: 'ChaosLens',
    title: 'ChaosLens — Architecture failure simulation without production risk | ArchLens',
    description:
      'ChaosLens simulates what-if failures on your BlueprintSpec architecture in the browser — blast radius and SLA impact without game-day breakage.',
    softwareName: 'ChaosLens',
  },
  '/guide/advicelens': {
    headline: 'AdviceLens',
    title: 'AdviceLens — Ranked architecture fix recommendations | ArchLens',
    description:
      'AdviceLens merges TraceLens forensics and ChaosLens simulations into a ranked, evidence-backed architecture action list.',
    softwareName: 'AdviceLens',
  },
  '/guide/schema': {
    headline: 'BlueprintSpec',
    title: 'BlueprintSpec — YAML architecture contract schema | ArchLens',
    description:
      'BlueprintSpec is the ArchLens YAML SystemSchema contract for C4 systems, containers, components, and entityRef-linked diagrams.',
    softwareName: 'BlueprintSpec',
  },
  '/guide/chaos-spec': {
    headline: 'ChaosSpec',
    title: 'ChaosSpec — Versioned chaos scenarios for architecture diagrams | ArchLens',
    description:
      'ChaosSpec YAML targets BlueprintSpec diagrams so ChaosLens failure scenarios stay versioned beside your architecture.',
    softwareName: 'ChaosSpec',
  },
  '/guide/ci-workflows': {
    headline: 'GitHub Actions workflows',
    description:
      'Canonical map of ArchLens GitHub Actions workflows for CI, deploy, catalog publish, and quality gates.',
  },
  '/setup': {
    headline: 'Setup & local development',
    description:
      'Set up the ArchLens monorepo locally: mise toolchain, pnpm workspaces, Canvas, CLI, and ChaosLens WASM.',
  },
  '/tech-stack': {
    headline: 'Technology stack',
    description:
      'ArchLens technology stack: TypeScript, React, Vite, Zod BlueprintSpec core, Bun CLI, and Cloudflare Pages.',
  },
  '/architecture': {
    headline: 'Architecture & security',
    description:
      'ArchLens system architecture and security model for Canvas, CLI, storage adapters, and local-first authoring.',
  },
  '/chaoslens-engine': {
    headline: 'ChaosLens engine',
    description:
      'Contributor guide to the ChaosLens resilience engine (Go WASM + TypeScript fallback) used by ArchLens Canvas.',
  },
  '/advicelens-engine': {
    headline: 'AdviceLens engine',
    description:
      'Contributor guide to the AdviceLens recommendation engine that ranks architecture fixes from TraceLens and ChaosLens.',
  },
  '/features-unit': {
    headline: 'Unit test features',
    description:
      'Generated ArchLens unit-test feature report covering Canvas, CLI, and core BlueprintSpec behavior.',
    indexable: false,
  },
};

/** Paths that must have SEO records (docs pages + marketing). Exported for catalog sync tests. */
export const SEO_CATALOG_PATHS: string[] = Object.keys(PAGE_SEO);

function normalizePathname(pathname: string): string {
  const bare = pathname.split(/[?#]/)[0] ?? pathname;
  return bare.replace(/\/$/, '') || '/';
}

function titleFor(headline: string, explicit?: string): string {
  if (explicit) return explicit;
  if (headline === SITE_NAME) {
    return `${SITE_NAME} — Catch architecture risk before it becomes an outage`;
  }
  return `${headline} | ${SITE_NAME}`;
}

export function resolvePageSeo(pathname: string): PageSeo {
  const path = normalizePathname(pathname);

  if (path === '/workspace' || path.startsWith('/workspace/')) {
    return {
      path: '/workspace',
      headline: 'ArchLens Canvas workspace',
      title: 'ArchLens Canvas workspace | ArchLens',
      description:
        'Open the ArchLens Canvas workspace to author BlueprintSpec diagrams and run TraceLens, ChaosLens, and AdviceLens.',
      canonicalUrl: `${SITE_ORIGIN}/workspace`,
      ogImageUrl: SITE_SOCIAL_IMAGE,
      indexable: false,
      softwareName: 'ArchLens Canvas',
    };
  }

  const override = PAGE_SEO[path] ?? {
    headline: SITE_NAME,
    description: PRODUCT_HERO.lede,
    indexable: false,
  };

  const canonicalPath = path === '/' ? '/' : path;
  return {
    path: canonicalPath,
    headline: override.headline,
    title: titleFor(override.headline, override.title),
    description: override.description,
    canonicalUrl: `${SITE_ORIGIN}${canonicalPath === '/' ? '/' : canonicalPath}`,
    ogImageUrl: SITE_SOCIAL_IMAGE,
    indexable: override.indexable !== false,
    softwareName: override.softwareName,
  };
}

export function listIndexableSeoPaths(): string[] {
  return SEO_CATALOG_PATHS.filter(path => resolvePageSeo(path).indexable).sort((a, b) => {
    if (a === '/') return -1;
    if (b === '/') return 1;
    return a.localeCompare(b);
  });
}

function sitemapPriority(path: string): string {
  if (path === '/') return '1.0';
  if (
    path === '/guide/canvas' ||
    path === '/guide/cli' ||
    path === '/guide/tracelens' ||
    path === '/guide/chaoslens' ||
    path === '/guide/advicelens' ||
    path === '/guide/schema'
  ) {
    return '0.9';
  }
  if (path.startsWith('/guide') || path === '/journeys') return '0.8';
  return '0.5';
}

export function buildSitemapXml(
  paths: string[],
  lastmod = new Date().toISOString().slice(0, 10)
): string {
  const urls = paths
    .map(path => {
      const loc = path === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${sitemapPriority(path)}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function buildJsonLdGraph(pathname: string): Record<string, unknown> {
  const seo = resolvePageSeo(pathname);
  const organization = {
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: SITE_NAME,
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/assets/logo-dark.png`,
  };

  const website = {
    '@type': 'WebSite',
    '@id': `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    url: `${SITE_ORIGIN}/`,
    description: resolvePageSeo('/').description,
    publisher: { '@id': `${SITE_ORIGIN}/#organization` },
  };

  const graph: Array<Record<string, unknown>> = [organization, website];

  if (seo.softwareName) {
    graph.push({
      '@type': 'SoftwareApplication',
      '@id': `${seo.canonicalUrl}#software`,
      name: seo.softwareName,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web',
      url: seo.canonicalUrl,
      description: seo.description,
      image: seo.ogImageUrl,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      publisher: { '@id': `${SITE_ORIGIN}/#organization` },
    });
  }

  graph.push({
    '@type': 'WebPage',
    '@id': `${seo.canonicalUrl}#webpage`,
    url: seo.canonicalUrl,
    name: seo.title,
    description: seo.description,
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    primaryImageOfPage: seo.ogImageUrl,
  });

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
