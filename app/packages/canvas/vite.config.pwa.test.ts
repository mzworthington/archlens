import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const viteConfigPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'vite.config.ts');

describe('PWA Workbox navigation fallback (Cloudflare Pages)', () => {
  it('falls back to / so Workbox never fetches /index.html (Pages pretty-URLs 308 that path)', () => {
    const source = fs.readFileSync(viteConfigPath, 'utf8');
    expect(source).toMatch(/navigateFallback:\s*'\/'/);
    expect(source).not.toMatch(/navigateFallback:\s*'index\.html'/);
    expect(source).toMatch(/additionalManifestEntries/);
    expect(source).toMatch(/url:\s*'\//);
  });
});
