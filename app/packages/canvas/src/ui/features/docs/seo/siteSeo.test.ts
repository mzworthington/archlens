import { describe, expect, it } from 'vitest';
import { DOCS_PAGES } from '../pages';
import {
  SEO_CATALOG_PATHS,
  SITE_ORIGIN,
  SITE_SOCIAL_IMAGE,
  buildJsonLdGraph,
  buildSitemapXml,
  listIndexableSeoPaths,
  resolvePageSeo,
} from './siteSeo';

describe('siteSeo catalog', () => {
  it('resolves distinctive homepage metadata with social share image', () => {
    const seo = resolvePageSeo('/');
    expect(seo.title.toLowerCase()).toContain('archlens');
    expect(seo.description.toLowerCase()).toMatch(/architecture|outage|blueprint/);
    expect(seo.canonicalUrl).toBe(`${SITE_ORIGIN}/`);
    expect(seo.ogImageUrl).toBe(SITE_SOCIAL_IMAGE);
    expect(seo.indexable).toBe(true);
  });

  it('gives each product surface a unique title and description', () => {
    const products = [
      '/guide/canvas',
      '/guide/cli',
      '/guide/tracelens',
      '/guide/chaoslens',
      '/guide/advicelens',
      '/guide/schema',
    ] as const;

    const titles = new Set<string>();
    const descriptions = new Set<string>();

    for (const path of products) {
      const seo = resolvePageSeo(path);
      expect(seo.indexable).toBe(true);
      expect(seo.title.length).toBeGreaterThan(10);
      expect(seo.description.length).toBeGreaterThan(40);
      expect(seo.canonicalUrl).toBe(`${SITE_ORIGIN}${path}`);
      expect(seo.title.toLowerCase()).not.toBe('archlens - codebase map explorer');
      titles.add(seo.title);
      descriptions.add(seo.description);
    }

    expect(titles.size).toBe(products.length);
    expect(descriptions.size).toBe(products.length);
  });

  it('covers every docs page path with an SEO record', () => {
    for (const page of DOCS_PAGES) {
      expect(SEO_CATALOG_PATHS).toContain(page.path);
      const seo = resolvePageSeo(page.path);
      expect(seo.title.length).toBeGreaterThan(0);
      expect(seo.description.length).toBeGreaterThan(20);
      expect(seo.canonicalUrl).toBe(`${SITE_ORIGIN}${page.path === '/' ? '/' : page.path}`);
    }
  });

  it('marks workspace routes as non-indexable with a workspace title', () => {
    const seo = resolvePageSeo('/workspace?lens=chaoslens');
    expect(seo.indexable).toBe(false);
    expect(seo.title.toLowerCase()).toContain('archlens');
    expect(seo.canonicalUrl).toBe(`${SITE_ORIGIN}/workspace`);
  });

  it('builds a sitemap that lists indexable URLs and omits workspace', () => {
    const paths = listIndexableSeoPaths();
    expect(paths).toContain('/');
    expect(paths).toContain('/guide/chaoslens');
    expect(paths).toContain('/guide/tracelens');
    expect(paths).toContain('/journeys');
    expect(paths).not.toContain('/workspace');

    const xml = buildSitemapXml(paths, '2026-08-06');
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain(`${SITE_ORIGIN}/guide/chaoslens`);
    expect(xml).toContain('<urlset');
    expect(xml).not.toContain('/workspace');
  });

  it('builds JSON-LD graph with Organization, WebSite, and SoftwareApplication nodes', () => {
    const home = buildJsonLdGraph('/');
    expect(home['@context']).toBe('https://schema.org');
    const graph = home['@graph'] as Array<Record<string, unknown>>;
    const types = graph.map(node => node['@type']);
    expect(types).toContain('Organization');
    expect(types).toContain('WebSite');
    expect(types).toContain('SoftwareApplication');

    const chaos = buildJsonLdGraph('/guide/chaoslens');
    const chaosGraph = chaos['@graph'] as Array<Record<string, unknown>>;
    const apps = chaosGraph.filter(node => node['@type'] === 'SoftwareApplication');
    expect(apps.some(app => String(app.name).toLowerCase().includes('chaoslens'))).toBe(true);
  });
});
