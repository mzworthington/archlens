import { describe, expect, it } from 'vitest';
import { stripHtmlComments } from './stripHtmlComments';
import { DOCS_PAGES, resolveDocsAssetSrc, resolveDocsHref } from './pages';

describe('docs link resolution', () => {
  it('resolves relative markdown links within the guide', () => {
    expect(resolveDocsHref('./getting-started.md', 'guide')).toBe('/guide/getting-started');
    expect(resolveDocsHref('./canvas.md', 'guide')).toBe('/guide/canvas');
    expect(resolveDocsHref('./schema.md', 'guide')).toBe('/guide/schema');
    expect(resolveDocsHref('../setup.md', 'guide')).toBe('/setup');
    expect(resolveDocsHref('../chaoslens-engine.md', 'guide')).toBe('/chaoslens-engine');
  });

  it('registers the BlueprintSpec guide page', () => {
    const schemaPage = DOCS_PAGES.find(p => p.path === '/guide/schema');
    expect(schemaPage).toBeDefined();
    expect(schemaPage?.productAction?.href).toBe('/schemas/v4/blueprint.schema.json');
  });

  it('registers product CTAs for each product guide chapter', () => {
    const canvas = DOCS_PAGES.find(p => p.path === '/guide/canvas');
    const cli = DOCS_PAGES.find(p => p.path === '/guide/cli');
    const forensics = DOCS_PAGES.find(p => p.path === '/guide/forensics');
    const resilience = DOCS_PAGES.find(p => p.path === '/guide/resilience');

    expect(canvas?.productAction).toEqual({ label: 'Open Blueprint canvas', href: '/workspace' });
    expect(cli?.productAction?.external).toBe(true);
    expect(forensics?.productAction?.href).toBe('/forensics');
    expect(resilience?.productAction?.href).toBe('/workspace/blueprint?resilience=1');
  });

  it('resolves absolute docs paths', () => {
    expect(resolveDocsHref('/guide/', '')).toBe('/guide');
    expect(resolveDocsHref('/setup', '')).toBe('/setup');
    expect(resolveDocsHref('/chaoslens-engine', '')).toBe('/chaoslens-engine');
  });

  it('registers the ChaosLens engine reference page', () => {
    expect(DOCS_PAGES.some(p => p.path === '/chaoslens-engine')).toBe(true);
  });

  it('resolves feature report pages', () => {
    expect(resolveDocsHref('./features-unit.md', '')).toBe('/features-unit');
    expect(DOCS_PAGES.some(p => p.path === '/features-unit')).toBe(true);
    expect(DOCS_PAGES.some(p => p.path === '/features-e2e')).toBe(false);
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
