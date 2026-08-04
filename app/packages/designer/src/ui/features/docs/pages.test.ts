import { describe, expect, it } from 'vitest';
import { stripHtmlComments } from './stripHtmlComments';
import {
  DOCS_PAGES,
  DOCS_NAV,
  DOCS_SIDEBAR,
  isDocsNavActive,
  resolveDocsAssetSrc,
  resolveDocsHref,
} from './pages';

describe('docs link resolution', () => {
  it('resolves relative markdown links within the guide', () => {
    expect(resolveDocsHref('./getting-started.md', 'guide')).toBe('/guide/getting-started');
    expect(resolveDocsHref('./canvas.md', 'guide')).toBe('/guide/canvas');
    expect(resolveDocsHref('./schema.md', 'guide')).toBe('/guide/schema');
    expect(resolveDocsHref('./chaos-spec.md', 'guide')).toBe('/guide/chaos-spec');
    expect(resolveDocsHref('../setup.md', 'guide')).toBe('/setup');
    expect(resolveDocsHref('./advicelens.md', 'guide')).toBe('/guide/advicelens');
    expect(resolveDocsHref('../tech-stack.md', 'guide')).toBe('/tech-stack');
    expect(resolveDocsHref('../advicelens-engine.md', 'guide')).toBe('/advicelens-engine');
  });

  it('registers the BlueprintSpec and ChaosSpec guide pages', () => {
    const schemaPage = DOCS_PAGES.find(p => p.path === '/guide/schema');
    expect(schemaPage).toBeDefined();
    expect(schemaPage?.productAction?.label).toBe('View BlueprintSpec JSON');

    const chaosSpecPage = DOCS_PAGES.find(p => p.path === '/guide/chaos-spec');
    expect(chaosSpecPage).toBeDefined();
    expect(chaosSpecPage?.title).toBe('ChaosSpec');
    expect(chaosSpecPage?.productAction).toEqual({
      label: 'View ChaosSpec JSON',
      href: '/schemas/latest/chaos.schema.json',
      external: true,
    });
  });

  it('registers product CTAs for each product guide chapter', () => {
    const canvas = DOCS_PAGES.find(p => p.path === '/guide/canvas');
    const cli = DOCS_PAGES.find(p => p.path === '/guide/cli');
    const tracelens = DOCS_PAGES.find(p => p.path === '/guide/tracelens');
    const chaoslens = DOCS_PAGES.find(p => p.path === '/guide/chaoslens');
    const advicelens = DOCS_PAGES.find(p => p.path === '/guide/advicelens');

    expect(canvas?.productAction).toEqual({ label: 'Open ArchLens Canvas', href: '/workspace' });
    expect(cli?.productAction).toEqual({
      label: 'Install ArchLens',
      href: '/guide/getting-started',
    });
    expect(tracelens?.productAction?.href).toBe('/workspace?lens=tracelens');
    expect(chaoslens?.productAction?.href).toBe('/workspace/application?lens=chaoslens');
    expect(advicelens?.productAction).toEqual({
      label: 'Open AdviceLens',
      href: '/workspace?lens=advicelens',
    });
  });

  it('resolves in-app AdviceLens entry link', () => {
    expect(resolveDocsHref('/advicelens', '')).toBe('/advicelens');
  });

  it('resolves absolute docs paths', () => {
    expect(resolveDocsHref('/guide/', '')).toBe('/guide');
    expect(resolveDocsHref('/setup', '')).toBe('/setup');
    expect(resolveDocsHref('/chaoslens-engine', '')).toBe('/chaoslens-engine');
  });

  it('registers CI workflows and Tech sidebar pages', () => {
    expect(DOCS_PAGES.some(p => p.path === '/guide/ci-workflows')).toBe(true);
    expect(DOCS_PAGES.some(p => p.path === '/guide/ci-blueprints')).toBe(false);
    expect(DOCS_PAGES.some(p => p.path === '/guide/ci-advicelens')).toBe(false);
    expect(resolveDocsHref('./ci-workflows.md', 'guide')).toBe('/guide/ci-workflows');
  });

  it('groups docs nav into Start/Surfaces/Tech hubs and sidebar', () => {
    expect(DOCS_NAV.map(i => i.label)).toEqual(['Start', 'Surfaces', 'Tech']);
    expect(DOCS_SIDEBAR.map(s => s.title)).toEqual(['Start', 'Surfaces', 'Tech']);
    const start = DOCS_SIDEBAR.find(s => s.title === 'Start');
    const surfaces = DOCS_SIDEBAR.find(s => s.title === 'Surfaces');
    const tech = DOCS_SIDEBAR.find(s => s.title === 'Tech');
    expect(start?.items.map(i => i.path)).toEqual([
      '/guide',
      '/guide/getting-started',
      '/journeys',
    ]);
    expect(surfaces?.items.at(-2)).toEqual({ label: 'BlueprintSpec', path: '/guide/schema' });
    expect(surfaces?.items.at(-1)).toEqual({ label: 'ChaosSpec', path: '/guide/chaos-spec' });
    expect(tech?.items.map(i => i.label)).toContain('Design system');
    expect(DOCS_SIDEBAR.some(s => s.title === 'Contract')).toBe(false);
  });

  it('marks Start vs Surfaces vs Tech hubs active without colliding on CI workflows', () => {
    const start = DOCS_NAV.find(i => i.label === 'Start')!;
    const surfaces = DOCS_NAV.find(i => i.label === 'Surfaces')!;
    const tech = DOCS_NAV.find(i => i.label === 'Tech')!;
    expect(isDocsNavActive('/guide', start)).toBe(true);
    expect(isDocsNavActive('/guide/getting-started', start)).toBe(true);
    expect(isDocsNavActive('/journeys', start)).toBe(true);
    expect(isDocsNavActive('/guide/canvas', start)).toBe(false);
    expect(isDocsNavActive('/guide/canvas', surfaces)).toBe(true);
    expect(isDocsNavActive('/guide/schema', surfaces)).toBe(true);
    expect(isDocsNavActive('/guide/chaos-spec', surfaces)).toBe(true);
    expect(isDocsNavActive('/guide/canvas', tech)).toBe(false);
    expect(isDocsNavActive('/guide/ci-workflows', start)).toBe(false);
    expect(isDocsNavActive('/guide/ci-workflows', surfaces)).toBe(false);
    expect(isDocsNavActive('/guide/ci-workflows', tech)).toBe(true);
    expect(isDocsNavActive('/design-system', tech)).toBe(true);
    expect(isDocsNavActive('/design-system', start)).toBe(false);
  });

  it('registers the AdviceLens engine reference page', () => {
    expect(DOCS_PAGES.some(p => p.path === '/advicelens-engine')).toBe(true);
  });

  it('resolves feature report pages', () => {
    expect(resolveDocsHref('./features-unit.md', '')).toBe('/features-unit');
    expect(DOCS_PAGES.some(p => p.path === '/features-unit')).toBe(true);
    expect(DOCS_PAGES.some(p => p.path === '/features-e2e')).toBe(false);
  });

  it('resolves legacy guide chapter paths', () => {
    expect(resolveDocsHref('./forensics.md', 'guide')).toBe('/guide/tracelens');
    expect(resolveDocsHref('./resilience.md', 'guide')).toBe('/guide/chaoslens');
    expect(resolveDocsHref('./tracelens.md', 'guide')).toBe('/guide/tracelens');
    expect(resolveDocsHref('./chaoslens.md', 'guide')).toBe('/guide/chaoslens');
    expect(resolveDocsHref('./design-system.md', 'guide')).toBe('/design-system');
  });

  it('resolves in-app TraceLens links', () => {
    expect(resolveDocsHref('/tracelens', '')).toBe('/tracelens');
  });

  it('resolves in-app workspace links', () => {
    expect(resolveDocsHref('/workspace', '')).toBe('/workspace');
  });

  it('maps screenshot assets under /docs-assets', () => {
    expect(resolveDocsAssetSrc('./screenshots/1-panels-expanded.png', '')).toBe(
      '/docs-assets/screenshots/1-panels-expanded.png'
    );
  });
});

describe('stripHtmlComments', () => {
  it('removes HTML comments used as reporter placeholders', () => {
    const md = `# Title

<!-- vitest-feature-reporter--start -->
## CLI
 - ✅ works
<!-- vitest-feature-reporter--end -->
`;
    const stripped = stripHtmlComments(md);
    expect(stripped).not.toContain('<!--');
    expect(stripped).toContain('## CLI');
    expect(stripped).toContain('✅ works');
  });
});
