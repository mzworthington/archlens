import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const redirectsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '_redirects');

describe('_redirects (Cloudflare Pages SPA routing)', () => {
  it('serves static assets and /index.html (200) before the SPA fallback so Workbox is not 308-redirected', () => {
    const lines = fs
      .readFileSync(redirectsPath, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    const wwwIdx = lines.findIndex(line => line.startsWith('https://www.archlens.dev/'));
    const bundledIdx = lines.findIndex(line => line.startsWith('/bundled-blueprints/'));
    const chaosIdx = lines.findIndex(line => line.startsWith('/bundled-chaos-specs/'));
    const schemasIdx = lines.findIndex(line => line.startsWith('/schemas/'));
    const sitemapIdx = lines.findIndex(line => line.startsWith('/sitemap.xml'));
    const robotsIdx = lines.findIndex(line => line.startsWith('/robots.txt'));
    const indexHtmlIdx = lines.findIndex(
      line => line.startsWith('/index.html') && line.includes('200')
    );
    const spaIdx = lines.findIndex(line => line.startsWith('/*') && line.includes('/index.html'));

    expect(wwwIdx).toBeGreaterThanOrEqual(0);
    expect(lines[wwwIdx]).toContain('https://archlens.dev/:splat');
    expect(lines[wwwIdx]).toContain('301');
    expect(bundledIdx).toBeGreaterThanOrEqual(0);
    expect(chaosIdx).toBeGreaterThanOrEqual(0);
    expect(schemasIdx).toBeGreaterThanOrEqual(0);
    expect(sitemapIdx).toBeGreaterThanOrEqual(0);
    expect(robotsIdx).toBeGreaterThanOrEqual(0);
    expect(spaIdx).toBeGreaterThanOrEqual(0);
    expect(indexHtmlIdx).toBeGreaterThanOrEqual(0);
    expect(indexHtmlIdx).toBeLessThan(spaIdx);
    expect(bundledIdx).toBeLessThan(spaIdx);
    expect(chaosIdx).toBeLessThan(spaIdx);
    expect(schemasIdx).toBeLessThan(spaIdx);
    expect(sitemapIdx).toBeLessThan(spaIdx);
    expect(robotsIdx).toBeLessThan(spaIdx);
  });
});
