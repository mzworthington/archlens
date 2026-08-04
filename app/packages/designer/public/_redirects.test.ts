import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const redirectsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '_redirects');

describe('_redirects (Cloudflare Pages SPA routing)', () => {
  it('serves bundled-blueprints and schemas before the index.html fallback', () => {
    const lines = fs
      .readFileSync(redirectsPath, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    const bundledIdx = lines.findIndex(line => line.startsWith('/bundled-blueprints/'));
    const schemasIdx = lines.findIndex(line => line.startsWith('/schemas/'));
    const spaIdx = lines.findIndex(line => line.includes('/index.html'));

    expect(bundledIdx).toBeGreaterThanOrEqual(0);
    expect(schemasIdx).toBeGreaterThanOrEqual(0);
    expect(spaIdx).toBeGreaterThanOrEqual(0);
    expect(bundledIdx).toBeLessThan(spaIdx);
    expect(schemasIdx).toBeLessThan(spaIdx);
  });
});
