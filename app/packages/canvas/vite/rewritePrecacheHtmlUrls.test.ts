import { describe, expect, it } from 'vitest';
import { prettyUrlForHtmlPrecache, rewritePrecacheHtmlUrls } from './rewritePrecacheHtmlUrls';

describe('prettyUrlForHtmlPrecache (Cloudflare Pages pretty-URLs)', () => {
  it('maps index.html shells to the directory URL that returns 200', () => {
    expect(prettyUrlForHtmlPrecache('index.html')).toBe('/');
    expect(prettyUrlForHtmlPrecache('/index.html')).toBe('/');
    expect(prettyUrlForHtmlPrecache('guide/canvas/index.html')).toBe('guide/canvas/');
    expect(prettyUrlForHtmlPrecache('/guide/canvas/index.html')).toBe('guide/canvas/');
  });

  it('leaves non-HTML and already-pretty URLs unchanged', () => {
    expect(prettyUrlForHtmlPrecache('/')).toBe('/');
    expect(prettyUrlForHtmlPrecache('guide/canvas/')).toBe('guide/canvas/');
    expect(prettyUrlForHtmlPrecache('assets/index-DHck-JRB.js')).toBe('assets/index-DHck-JRB.js');
    expect(prettyUrlForHtmlPrecache('manifest.webmanifest')).toBe('manifest.webmanifest');
  });
});

describe('rewritePrecacheHtmlUrls', () => {
  it('rewrites globbed index.html entries so Workbox never fetches a 308', () => {
    const rewritten = rewritePrecacheHtmlUrls([
      { url: 'index.html', revision: 'html-hash' },
      { url: 'guide/canvas/index.html', revision: 'docs-hash' },
      { url: 'assets/app.js', revision: null },
    ]);

    expect(rewritten).toEqual([
      { url: '/', revision: 'html-hash' },
      { url: 'guide/canvas/', revision: 'docs-hash' },
      { url: 'assets/app.js', revision: null },
    ]);
  });

  it('rewrites the live generateSW HTML set to directory URLs', () => {
    const liveHtmlUrls = [
      'index.html',
      'tech-stack/index.html',
      'setup/index.html',
      'privacy/index.html',
      'journeys/index.html',
      'guide/index.html',
      'guide/tracelens/index.html',
      'guide/schema/index.html',
      'guide/jobs/index.html',
      'guide/getting-started/index.html',
      'guide/collaborate/index.html',
      'guide/cli/index.html',
      'guide/ci-workflows/index.html',
      'guide/chaoslens/index.html',
      'guide/chaos-spec/index.html',
      'guide/canvas/index.html',
      'guide/advicelens/index.html',
      'chaoslens-engine/index.html',
      'architecture/index.html',
      'advicelens-engine/index.html',
      'ADRs/index.html',
    ];

    const rewritten = rewritePrecacheHtmlUrls(liveHtmlUrls.map(url => ({ url, revision: url })));

    expect(rewritten.map(entry => entry.url)).toEqual([
      '/',
      'tech-stack/',
      'setup/',
      'privacy/',
      'journeys/',
      'guide/',
      'guide/tracelens/',
      'guide/schema/',
      'guide/jobs/',
      'guide/getting-started/',
      'guide/collaborate/',
      'guide/cli/',
      'guide/ci-workflows/',
      'guide/chaoslens/',
      'guide/chaos-spec/',
      'guide/canvas/',
      'guide/advicelens/',
      'chaoslens-engine/',
      'architecture/',
      'advicelens-engine/',
      'ADRs/',
    ]);
    expect(rewritten.some(entry => entry.url.endsWith('index.html'))).toBe(false);
  });

  it('dedupes rewritten index.html against an explicit / shell entry', () => {
    const rewritten = rewritePrecacheHtmlUrls([
      { url: 'index.html', revision: 'html-hash' },
      { url: '/', revision: 'build-id' },
      { url: 'guide/index.html', revision: 'guide-hash' },
    ]);

    expect(rewritten).toEqual([
      { url: '/', revision: 'build-id' },
      { url: 'guide/', revision: 'guide-hash' },
    ]);
  });
});
