import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const headersPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '_headers');

describe('_headers (Cloudflare Pages)', () => {
  it('keeps version.json uncacheable and HTML revalidating for deploy smoke', () => {
    const text = fs.readFileSync(headersPath, 'utf8');
    expect(text).toMatch(/\/version\.json[\s\S]*Cache-Control:\s*no-store/);
    expect(text).toMatch(/\/\*\.html[\s\S]*Cache-Control:\s*no-cache/);
  });
});
