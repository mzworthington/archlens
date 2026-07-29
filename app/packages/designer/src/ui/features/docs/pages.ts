import setupMd from '@docs/setup.md?raw';
import architectureMd from '@docs/architecture.md?raw';
import journeysMd from '@docs/journeys.md?raw';
import featuresUnitMd from '@docs/features-unit.md?raw';
import guideIndexMd from '@docs/guide/index.md?raw';
import guideGettingStartedMd from '@docs/guide/getting-started.md?raw';
import guideCanvasMd from '@docs/guide/canvas.md?raw';
import guideCliMd from '@docs/guide/cli.md?raw';
import guideTraceLensMd from '@docs/guide/tracelens.md?raw';
import guideChaosLensMd from '@docs/guide/chaoslens.md?raw';
import guideSchemaMd from '@docs/guide/schema.md?raw';
import chaoslensEngineMd from '@docs/chaoslens-engine.md?raw';

export type DocsNavItem = {
  label: string;
  path: string;
};

export type DocsProductAction = {
  label: string;
  href: string;
  /** Open in a new tab (releases, raw schema JSON, etc.). */
  external?: boolean;
};

export type DocsPageMeta = {
  path: string;
  title: string;
  markdown: string;
  /** Directory of this page within docs/ - used to resolve relative links/images. */
  dir: string;
  group: 'guide' | 'reference';
  /** Show a client-side search filter (feature report pages). */
  filterable?: boolean;
  /** Primary call-to-action linking into the live product surface. */
  productAction?: DocsProductAction;
};

/** Primary header links - product guide chapters (reference lives in the sidebar). */
export const DOCS_NAV: DocsNavItem[] = [
  { label: 'Overview', path: '/guide' },
  { label: 'Getting started', path: '/guide/getting-started' },
  { label: 'ArchLens Canvas', path: '/guide/canvas' },
  { label: 'ArchLens', path: '/guide/cli' },
  { label: 'TraceLens', path: '/guide/tracelens' },
  { label: 'ChaosLens', path: '/guide/chaoslens' },
  { label: 'BlueprintSpec', path: '/guide/schema' },
];

export const DOCS_SIDEBAR: { title: string; items: DocsNavItem[] }[] = [
  {
    title: 'Product guide',
    items: [
      { label: 'Overview', path: '/guide' },
      { label: 'Getting started', path: '/guide/getting-started' },
      { label: 'ArchLens Canvas', path: '/guide/canvas' },
      { label: 'ArchLens', path: '/guide/cli' },
      { label: 'TraceLens', path: '/guide/tracelens' },
      { label: 'ChaosLens', path: '/guide/chaoslens' },
      { label: 'BlueprintSpec', path: '/guide/schema' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { label: 'Setup & local development', path: '/setup' },
      { label: 'ChaosLens engine', path: '/chaoslens-engine' },
      { label: 'Architecture & security', path: '/architecture' },
      { label: 'Interface tour & journeys', path: '/journeys' },
      { label: 'Unit test features', path: '/features-unit' },
    ],
  },
];

export const DOCS_PAGES: DocsPageMeta[] = [
  { path: '/guide', title: 'Product guide', markdown: guideIndexMd, dir: 'guide', group: 'guide' },
  {
    path: '/guide/getting-started',
    title: 'Getting started',
    markdown: guideGettingStartedMd,
    dir: 'guide',
    group: 'guide',
  },
  {
    path: '/guide/canvas',
    title: 'ArchLens Canvas',
    markdown: guideCanvasMd,
    dir: 'guide',
    group: 'guide',
    productAction: { label: 'Open ArchLens Canvas', href: '/workspace' },
  },
  {
    path: '/guide/cli',
    title: 'ArchLens',
    markdown: guideCliMd,
    dir: 'guide',
    group: 'guide',
    productAction: {
      label: 'Download ArchLens',
      href: 'https://github.com/mzworthington/archlens/releases/latest',
      external: true,
    },
  },
  {
    path: '/guide/tracelens',
    title: 'TraceLens',
    markdown: guideTraceLensMd,
    dir: 'guide',
    group: 'guide',
    productAction: { label: 'Open TraceLens', href: '/tracelens' },
  },
  {
    path: '/guide/chaoslens',
    title: 'ChaosLens',
    markdown: guideChaosLensMd,
    dir: 'guide',
    group: 'guide',
    productAction: {
      label: 'Open ChaosLens',
      href: '/workspace/blueprint?resilience=1',
    },
  },
  {
    path: '/guide/schema',
    title: 'BlueprintSpec',
    markdown: guideSchemaMd,
    dir: 'guide',
    group: 'guide',
    productAction: {
      label: 'View BlueprintSpec JSON',
      href: '/schemas/latest/blueprint.schema.json',
      external: true,
    },
  },
  {
    path: '/setup',
    title: 'Setup & local development',
    markdown: setupMd,
    dir: '',
    group: 'reference',
  },
  {
    path: '/chaoslens-engine',
    title: 'ChaosLens engine',
    markdown: chaoslensEngineMd,
    dir: '',
    group: 'reference',
  },
  {
    path: '/architecture',
    title: 'Architecture & security',
    markdown: architectureMd,
    dir: '',
    group: 'reference',
  },
  {
    path: '/journeys',
    title: 'Interface tour & journeys',
    markdown: journeysMd,
    dir: '',
    group: 'reference',
  },
  {
    path: '/features-unit',
    title: 'Unit test features',
    markdown: featuresUnitMd,
    dir: '',
    group: 'reference',
    filterable: true,
  },
];

/** Permanent aliases for renamed product guide chapters and markdown filenames. */
const LEGACY_GUIDE_PATH_ALIASES: Record<string, string> = {
  '/guide/forensics': '/guide/tracelens',
  '/guide/resilience': '/guide/chaoslens',
};

export function findDocsPage(pathname: string): DocsPageMeta | undefined {
  const normalized = pathname.replace(/\/$/, '') || '/';
  const aliased = LEGACY_GUIDE_PATH_ALIASES[normalized] ?? normalized;
  return DOCS_PAGES.find(p => p.path === aliased);
}

/**
 * Resolve a Markdown link href (relative .md or absolute docs path) to an in-app route.
 * Returns null when the target is not a known docs page (e.g. source-file links).
 */
export function resolveDocsHref(href: string, fromDir: string): string | null {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || /^[a-z]+:/i.test(href)) {
    return null;
  }

  let target = href.split('#')[0] ?? href;
  if (target.endsWith('.html')) {
    target = target.replace(/\.html$/, '');
  }

  let joined: string;
  if (target.startsWith('/')) {
    joined = target.replace(/\/$/, '') || '/';
  } else {
    const baseSegments = fromDir ? fromDir.split('/').filter(Boolean) : [];
    const parts = target.split('/');
    for (const part of parts) {
      if (part === '.' || part === '') continue;
      if (part === '..') {
        baseSegments.pop();
        continue;
      }
      baseSegments.push(part);
    }
    joined = '/' + baseSegments.join('/');
    joined = joined.replace(/\.md$/, '');
    if (joined.endsWith('/index')) {
      joined = joined.slice(0, -'/index'.length) || '/';
    }
    joined = joined.replace(/\/$/, '') || '/';
  }

  joined = LEGACY_GUIDE_PATH_ALIASES[joined] ?? joined;

  if (
    joined === '/' ||
    joined.startsWith('/workspace') ||
    joined === '/tracelens' ||
    joined === '/design-system' ||
    DOCS_PAGES.some(p => p.path === joined)
  ) {
    return joined;
  }
  return null;
}

export function resolveDocsAssetSrc(src: string, fromDir: string): string {
  if (!src || src.startsWith('http') || src.startsWith('data:') || src.startsWith('/')) {
    return src;
  }
  // ./screenshots/foo.png → /docs-assets/screenshots/foo.png (copied in vite)
  const cleaned = src.replace(/^\.\//, '');
  const prefix = fromDir ? `${fromDir}/` : '';
  return `/docs-assets/${prefix}${cleaned}`.replace(/\/+/g, '/');
}
