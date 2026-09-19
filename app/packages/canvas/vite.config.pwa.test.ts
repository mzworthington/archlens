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

  it('does not precache *.html — Pages pretty-URLs 308 those paths and fail Firefox install', () => {
    const source = fs.readFileSync(viteConfigPath, 'utf8');
    expect(source).not.toMatch(/\*\*\/\*\.\{[^}]*html/);
    expect(source).toMatch(/'\*\*\/\*\.html'/);
  });

  it('does not precache *.wasm — Workbox install exceeds Firefox cache quota', () => {
    const source = fs.readFileSync(viteConfigPath, 'utf8');
    expect(source).not.toMatch(/\*\*\/\*\.\{[^}]*wasm/);
    expect(source).toMatch(/'\*\*\/\*\.wasm'/);
  });

  it('rewrites any remaining precache HTML to pretty URLs so install does not cache a 308', () => {
    const source = fs.readFileSync(viteConfigPath, 'utf8');
    expect(source).toMatch(/sanitizePrecacheManifest/);
    expect(source).toMatch(/manifestTransforms/);
  });

  it('does not glob wasm — Firefox install waits on ~14MB of tree-sitter/chaoslens binaries', () => {
    const source = fs.readFileSync(viteConfigPath, 'utf8');
    expect(source).not.toMatch(/\*\*\/\*\.\{[^}]*wasm/);
    expect(source).toMatch(/'\*\*\/\*\.wasm'/);
    expect(source).toMatch(/pathname\.endsWith\('\.wasm'\)/);
  });
});
