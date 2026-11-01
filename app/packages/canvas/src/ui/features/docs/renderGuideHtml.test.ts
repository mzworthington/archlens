import { describe, expect, it } from 'vitest';
import guideTraceLensMd from '@docs/guide/tracelens.md?raw';
import { renderGuideHtml } from './renderGuideHtml';
import { TRACELENS_POSTER_SRC } from './tracelensDemo';

describe('renderGuideHtml', () => {
  it('paints the TraceLens guide from a sized still instead of the GIF', () => {
    const html = renderGuideHtml(guideTraceLensMd, 'guide');

    expect(html).toContain(`src="${TRACELENS_POSTER_SRC}"`);
    expect(html).toContain('width="1280"');
    expect(html).toContain('height="828"');
    expect(html).toContain('alt="TraceLens ranked offenders"');
    expect(html).toContain('data-demo-file="tracelens.gif"');
    expect(html).not.toMatch(/<img[^>]+tracelens\.gif/);
    expect(html).toContain('id="what-is-stored"');
    expect(html).toContain('href="/guide/advicelens"');
    expect(html).toContain('href="/guide/chaoslens"');
    expect(html).toContain('class="docs-table-wrap"');
    expect(html).toContain('<code>hotspotThreshold</code>');
  });

  it('numbers a repeated heading the same way the markdown view does', () => {
    const html = renderGuideHtml('## Same\n\n## Same\n', 'guide');
    expect(html).toContain('id="same"');
    expect(html).toContain('id="same-1"');
  });

  it('leaves source-file links as written', () => {
    const html = renderGuideHtml('[file](../../src/main.ts)\n', 'guide');
    expect(html).toContain('href="../../src/main.ts"');
  });

  it('opens absolute http links in a new tab', () => {
    const html = renderGuideHtml('[site](https://archlens.dev)\n', 'guide');
    expect(html).toContain('href="https://archlens.dev"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
  });
});
