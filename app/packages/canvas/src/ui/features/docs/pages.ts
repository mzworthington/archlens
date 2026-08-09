import setupMd from '@docs/setup.md?raw';
import architectureMd from '@docs/architecture.md?raw';
import techStackMd from '@docs/tech-stack.md?raw';
import featuresUnitMd from '@docs/features-unit.md?raw';
import guideIndexMd from '@docs/guide/index.md?raw';
import guideGettingStartedMd from '@docs/guide/getting-started.md?raw';
import guideCanvasMd from '@docs/guide/canvas.md?raw';
import guideCliMd from '@docs/guide/cli.md?raw';
import guideTraceLensMd from '@docs/guide/tracelens.md?raw';
import guideChaosLensMd from '@docs/guide/chaoslens.md?raw';
import guideAdviceLensMd from '@docs/guide/advicelens.md?raw';
import guideSchemaMd from '@docs/guide/schema.md?raw';
import guideChaosSpecMd from '@docs/guide/chaos-spec.md?raw';
import guideCiWorkflowsMd from '@docs/guide/ci-workflows.md?raw';
import chaoslensEngineMd from '@docs/chaoslens-engine.md?raw';
import advicelensEngineMd from '@docs/advicelens-engine.md?raw';
import { ADVICELENS_ENTRY_URL } from '../forensics/adviceLensUrl';

export type DocsNavItem = {
  label: string;
  path: string;
  /**
   * Extra path prefixes that mark this hub link active (in addition to `path`).
   * Used when a section spans multiple roots (e.g. Tech → /setup, /tech-stack, …).
   */
  matchPrefixes?: string[];
};

export type DocsSidebarSection = {
  title: string;
  items: DocsNavItem[];
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

const START_PATH_PREFIXES = ['/guide/getting-started', '/journeys'];

const SURFACES_PATH_PREFIXES = [
  '/guide/canvas',
  '/guide/cli',
  '/guide/tracelens',
  '/guide/chaoslens',
  '/guide/advicelens',
  '/guide/schema',
  '/guide/chaos-spec',
];

const TECH_PATH_PREFIXES = [
  '/setup',
  '/tech-stack',
  '/architecture',
  '/design-system',
  '/chaoslens-engine',
  '/advicelens-engine',
  '/features-unit',
  '/guide/ci-workflows',
];

/** Header hubs - chapter lists live in the sidebar / mobile section scrollers. */
export const DOCS_NAV: DocsNavItem[] = [
  // path `/guide` is overview-only; surface chapters use the Surfaces hub.
  { label: 'Start', path: '/guide', matchPrefixes: START_PATH_PREFIXES },
  { label: 'Surfaces', path: '/guide/canvas', matchPrefixes: SURFACES_PATH_PREFIXES },
  { label: 'Tech', path: '/setup', matchPrefixes: TECH_PATH_PREFIXES },
];

/** Sidebar + mobile section nav (grouped product guide + tech). */
export const DOCS_SIDEBAR: DocsSidebarSection[] = [
  {
    title: 'Start',
    items: [
      { label: 'Overview', path: '/guide' },
      { label: 'Getting started', path: '/guide/getting-started' },
      { label: 'Interface tour & journeys', path: '/journeys' },
    ],
  },
  {
    title: 'Surfaces',
    items: [
      { label: 'ArchLens Canvas', path: '/guide/canvas' },
      { label: 'ArchLens CLI', path: '/guide/cli' },
      { label: 'TraceLens', path: '/guide/tracelens' },
      { label: 'ChaosLens', path: '/guide/chaoslens' },
      { label: 'AdviceLens', path: '/guide/advicelens' },
      { label: 'BlueprintSpec', path: '/guide/schema' },
      { label: 'ChaosSpec', path: '/guide/chaos-spec' },
    ],
  },
  {
    title: 'Tech',
    items: [
      { label: 'Design system', path: '/design-system' },
      { label: 'GitHub Actions workflows', path: '/guide/ci-workflows' },
      { label: 'Setup & local development', path: '/setup' },
      { label: 'Technology stack', path: '/tech-stack' },
      { label: 'Architecture & security', path: '/architecture' },
      { label: 'ChaosLens engine', path: '/chaoslens-engine' },
      { label: 'AdviceLens engine', path: '/advicelens-engine' },
    ],
  },
];

export function isDocsNavActive(location: string, item: DocsNavItem): boolean {
  if (item.matchPrefixes?.length) {
    // Exact hub path (e.g. Start → `/guide`) without treating sibling `/guide/*` chapters as active.
    if (location === item.path) return true;
    return item.matchPrefixes.some(
      prefix => location === prefix || (prefix !== '/' && location.startsWith(`${prefix}/`))
    );
  }
  return location === item.path || location.startsWith(`${item.path}/`);
}

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
    title: 'ArchLens CLI',
    markdown: guideCliMd,
    dir: 'guide',
    group: 'guide',
    productAction: {
      label: 'Install ArchLens CLI',
      href: '/guide/getting-started',
    },
  },
  {
    path: '/guide/tracelens',
    title: 'TraceLens',
    markdown: guideTraceLensMd,
    dir: 'guide',
    group: 'guide',
    productAction: { label: 'Open TraceLens', href: '/workspace?lens=tracelens' },
  },
  {
    path: '/guide/chaoslens',
    title: 'ChaosLens',
    markdown: guideChaosLensMd,
    dir: 'guide',
    group: 'guide',
    productAction: {
      label: 'Open ChaosLens',
      href: '/workspace/application?lens=chaoslens',
    },
  },
  {
    path: '/guide/advicelens',
    title: 'AdviceLens',
    markdown: guideAdviceLensMd,
    dir: 'guide',
    group: 'guide',
    productAction: { label: 'Open AdviceLens', href: ADVICELENS_ENTRY_URL },
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
    path: '/guide/chaos-spec',
    title: 'ChaosSpec',
    markdown: guideChaosSpecMd,
    dir: 'guide',
    group: 'guide',
    productAction: {
      label: 'View ChaosSpec JSON',
      href: '/schemas/latest/chaos.schema.json',
      external: true,
    },
  },
  {
    path: '/guide/ci-workflows',
    title: 'GitHub Actions workflows',
    markdown: guideCiWorkflowsMd,
    dir: 'guide',
    group: 'reference',
  },
  {
    path: '/setup',
    title: 'Setup & local development',
    markdown: setupMd,
    dir: '',
    group: 'reference',
  },
  {
    path: '/tech-stack',
    title: 'Technology stack',
    markdown: techStackMd,
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
    path: '/advicelens-engine',
    title: 'AdviceLens engine',
    markdown: advicelensEngineMd,
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
    path: '/features-unit',
    title: 'Unit test features',
    markdown: featuresUnitMd,
    dir: '',
    group: 'reference',
    filterable: true,
  },
];

export function findDocsPage(pathname: string): DocsPageMeta | undefined {
  const normalized = pathname.replace(/\/$/, '') || '/';
  return DOCS_PAGES.find(p => p.path === normalized);
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

  if (
    joined === '/' ||
    joined.startsWith('/workspace') ||
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
