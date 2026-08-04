import { describe, expect, it } from 'vitest';
import { stripHtmlComments } from './stripHtmlComments';
import { DOCS_PAGES, resolveDocsAssetSrc, resolveDocsHref } from './pages';

describe('docs link resolution', () => {
  it('resolves relative markdown links within the guide', () => {
    expect(resolveDocsHref('./getting-started.md', 'guide')).toBe('/guide/getting-started');
    expect(resolveDocsHref('./canvas.md', 'guide')).toBe('/guide/canvas');
    expect(resolveDocsHref('./schema.md', 'guide')).toBe('/guide/schema');
    expect(resolveDocsHref('../setup.md', 'guide')).toBe('/setup');
    expect(resolveDocsHref('./advicelens.md', 'guide')).toBe('/guide/advicelens');
    expect(resolveDocsHref('../tech-stack.md', 'guide')).toBe('/tech-stack');
    expect(resolveDocsHref('../advicelens-engine.md', 'guide')).toBe('/advicelens-engine');
  });

  it('registers the BlueprintSpec guide page', () => {
    const schemaPage = DOCS_PAGES.find(p => p.path === '/guide/schema');
    expect(schemaPage).toBeDefined();
    expect(schemaPage?.productAction?.label).toBe('View BlueprintSpec JSON');
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
