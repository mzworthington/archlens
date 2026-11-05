import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const canvasRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tokensPath = path.join(canvasRoot, 'src/ui/theme/tokens.css');

function occurrences(text: string, needle: string): number {
  let count = 0;
  let from = 0;
  while (from < text.length) {
    const at = text.indexOf(needle, from);
    if (at === -1) return count;
    count += 1;
    from = at + needle.length;
  }
  return count;
}

describe('blueprint design tokens', () => {
  it('defines canvas, surface, navy, ink, and accent once', () => {
    const tokens = fs.readFileSync(tokensPath, 'utf8');

    expect(tokens).toContain('--color-canvas: #173453');
    expect(tokens).toContain('--color-surface: #061125');
    expect(tokens).toContain('--color-navy: #040914');
    expect(tokens).toContain('--color-ink: #f3f4f6');
    expect(tokens).toContain('--color-accent: #00f0ff');
    expect(occurrences(tokens, '#173453')).toBe(1);
    expect(occurrences(tokens, '#061125')).toBe(1);
    expect(occurrences(tokens, '#040914')).toBe(1);
    expect(occurrences(tokens, '#f3f4f6')).toBe(1);
    expect(occurrences(tokens, '#00f0ff')).toBe(1);
  });

  it('points the shell canvas, ink, and accent at that token set', () => {
    const stylesheet = fs.readFileSync(path.join(canvasRoot, 'src/index.css'), 'utf8');

    expect(stylesheet).toContain("@import './ui/theme/tokens.css'");
    expect(stylesheet).toContain('--color-bp-canvas: var(--color-canvas)');
    expect(stylesheet).toContain('--color-brand-500: var(--color-accent)');
    expect(stylesheet).toContain('color: var(--color-ink)');
    expect(stylesheet).not.toContain('#173453');
    expect(stylesheet).not.toContain('#f3f4f6');
    expect(stylesheet).not.toContain('#00f0ff');
  });

  it('paints the site header from the token set', () => {
    const chrome = ['AppHeader.tsx', 'BrandMark.tsx']
      .map(name =>
        fs.readFileSync(path.join(canvasRoot, 'src/ui/components/AppHeader', name), 'utf8')
      )
      .join('\n');

    expect(chrome).not.toContain('#00f0ff');
    expect(chrome).not.toContain('#061125');
    expect(chrome).not.toContain('#040914');
  });

  it('paints the homepage from the token set', () => {
    const homepage = fs.readFileSync(
      path.join(canvasRoot, 'src/ui/features/docs/DocsHome.tsx'),
      'utf8'
    );

    expect(homepage).not.toContain('#00f0ff');
    expect(homepage).not.toContain('#061125');
    expect(homepage).not.toContain('#040914');
    expect(homepage).not.toContain('240, 255');
    expect(homepage).not.toContain('240,255');
  });

  it('paints the docs chrome from the token set', () => {
    const chrome = fs.readFileSync(
      path.join(canvasRoot, 'src/ui/features/docs/DocsShell.tsx'),
      'utf8'
    );

    expect(chrome).not.toContain('#00f0ff');
    expect(chrome).not.toContain('#061125');
    expect(chrome).not.toContain('#040914');
  });
});
