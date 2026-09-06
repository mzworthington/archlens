import { PRODUCT_HERO } from '../../../content/productOutcomes.ts';

export const SITE_ORIGIN = 'https://archlens.dev';
const SITE_NAME = 'ArchLens';
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

/** Canonical public SEO records - keep in sync with docs routes in `pages.ts`. */
const PAGE_SEO: Record<string, SeoOverride> = {
  '/': {
    headline: SITE_NAME,
    title: PRODUCT_HERO.documentTitle,
    description: `${PRODUCT_HERO.lede} Open source. Canvas, TraceLens, ChaosLens and AdviceLens.`,
    softwareName: SITE_NAME,
  },
  '/journeys': {
    headline: 'Interface tour & journeys',
    description:
      'Interactive ArchLens product tour: golden-journey demos for Canvas, TraceLens, ChaosLens and AdviceLens.',
  },
  '/design-system': {
    headline: 'Design system',
    description:
      'ArchLens design tokens, components and patterns shared by the homepage, docs and Canvas.',
    indexable: false,
  },
  '/guide': {
    headline: 'Product guide',
    description:
      'ArchLens product guide: Canvas, the CLI, TraceLens, ChaosLens, AdviceLens and BlueprintSpec.',
  },
  '/guide/getting-started': {
    headline: 'Getting started with ArchLens',
    description:
      'Install ArchLens CLI, generate BlueprintSpec from your repo and open the diagrams in Canvas.',
  },
  '/guide/jobs': {
    headline: 'Jobs for today',
    description:
      'Pick an ArchLens job: try the demo, share a live map, import Mermaid, scan a folder, run the CLI, open a published catalog, fault a service, rank fixes or gate a PR.',
  },
  '/guide/canvas': {
    headline: 'ArchLens Canvas',
    title: 'ArchLens Canvas - BlueprintSpec maps in the browser | ArchLens',
    description:
      'ArchLens Canvas is the map over BlueprintSpec: local folders, live share rooms, diagram sync and catalogs published from CI.',
    softwareName: 'ArchLens Canvas',
  },
  '/guide/collaborate': {
    headline: 'Collaborate',
    title: 'Collaborate - live share rooms on the map | ArchLens',
    description:
      'Join a room with your peers on a live ArchLens map: named cursors, optional room secret and a shared BlueprintSpec working copy. Disk commit stays on Pending Changes.',
    softwareName: 'ArchLens Canvas',
  },
  '/guide/cli': {
    headline: 'ArchLens CLI',
    title: 'ArchLens CLI - scan a repo to BlueprintSpec | ArchLens',
    description:
      'ArchLens CLI scans source, discovers systems and dependencies and writes a validated multi-level BlueprintSpec.',
    softwareName: 'ArchLens CLI',
  },
  '/guide/tracelens': {
    headline: 'TraceLens',
    title: 'TraceLens - git hotspots on the diagram | ArchLens',
    description:
      'TraceLens overlays git churn, complexity, temporal coupling and blueprint dependency risk on ArchLens diagrams.',
    softwareName: 'TraceLens',
  },
  '/guide/chaoslens': {
    headline: 'ChaosLens',
    title: 'ChaosLens - simulate failures on the open map | ArchLens',
    description:
      'ChaosLens simulates what-if failures on your BlueprintSpec in the browser: blast radius and SLA bands, without a game day in production.',
    softwareName: 'ChaosLens',
  },
  '/guide/advicelens': {
    headline: 'AdviceLens',
    title: 'AdviceLens - ranked fixes from TraceLens and ChaosLens | ArchLens',
    description:
      'AdviceLens merges TraceLens forensics and ChaosLens simulations into a ranked action list for the studio and CI.',
    softwareName: 'AdviceLens',
  },
  '/guide/schema': {
    headline: 'BlueprintSpec',
    title: 'BlueprintSpec - architecture contract schema | ArchLens',
    description:
      'BlueprintSpec is the ArchLens architecture contract for systems, containers, components and entityRef-linked diagrams.',
    softwareName: 'BlueprintSpec',
  },
  '/guide/chaos-spec': {
    headline: 'ChaosSpec',
    title: 'ChaosSpec - versioned failure scenarios | ArchLens',
    description:
      'ChaosSpec targets BlueprintSpec diagrams so ChaosLens failure scenarios stay versioned beside your architecture.',
    softwareName: 'ChaosSpec',
  },
  '/guide/ci-workflows': {
    headline: 'GitHub Actions workflows',
    description:
      'Canonical map of ArchLens GitHub Actions workflows for CI, deploy, catalog publish and quality gates.',
  },
  '/setup': {
    headline: 'Setup & local development',
    description:
      'Set up the ArchLens monorepo locally: mise toolchain, pnpm workspaces, Canvas, CLI and ChaosLens WASM.',
  },
  '/tech-stack': {
    headline: 'Technology stack',
    description:
      'ArchLens technology stack: TypeScript, React, Vite, Zod BlueprintSpec core, Bun CLI and Cloudflare Pages.',
  },
  '/architecture': {
    headline: 'Architecture & security',
    description:
      'ArchLens system architecture and security model for Canvas, CLI, storage adapters and local-first authoring.',
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
      'Generated ArchLens unit-test feature report covering Canvas, CLI and core BlueprintSpec behavior.',
    indexable: false,
  },
  '/ADRs': {
    headline: 'Architecture Decision Records',
    description:
      'ArchLens ADRs: sparse MADR records for hard-to-reverse architecture choices across Canvas, CLI and core.',
  },
  '/privacy': {
    headline: 'Privacy policy',
    description:
      'How ArchLens handles diagrams on your device, Cloudflare hosting and opt-in PostHog Cloud EU analytics.',
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
    return PRODUCT_HERO.documentTitle;
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
        'Open ArchLens Canvas to author BlueprintSpec diagrams and run TraceLens, ChaosLens and AdviceLens.',
      canonicalUrl: `${SITE_ORIGIN}/workspace`,
      ogImageUrl: SITE_SOCIAL_IMAGE,
      indexable: false,
      softwareName: 'ArchLens Canvas',
    };
  }

  if (path.startsWith('/ADRs/')) {
    const stem = path.slice('/ADRs/'.length);
    const number = stem.match(/^(\d+)/)?.[1];
    const headline = number
      ? `Architecture Decision Record ${number}`
      : 'Architecture Decision Record';
    return {
      path,
      headline,
      title: titleFor(headline),
      description: `ArchLens architecture decision record ${stem}: sparse MADR notes for hard-to-reverse product choices.`,
      canonicalUrl: `${SITE_ORIGIN}${path}`,
      ogImageUrl: SITE_SOCIAL_IMAGE,
      indexable: false,
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
