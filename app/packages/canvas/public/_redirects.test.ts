import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const redirectsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '_redirects');

function redirectLines(): string[] {
  return fs
    .readFileSync(redirectsPath, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

describe('_redirects (Cloudflare Pages)', () => {
  it('canonicalises www, 404s real asset prefixes, and serves /index.html without a pretty-URL 308', () => {
    const lines = redirectLines();

    expect(lines).toEqual([
      'https://www.archlens.dev/* https://archlens.dev/:splat 301',
      '/assets/*              /assets/:splat              200',
      '/bundled-blueprints/*  /bundled-blueprints/:splat  200',
      '/bundled-chaos-specs/* /bundled-chaos-specs/:splat 200',
      '/schemas/*             /schemas/:splat             200',
      '/index.html            /index.html                 200',
    ]);
    expect(lines.some(line => line.startsWith('/*'))).toBe(false);
  });
});
