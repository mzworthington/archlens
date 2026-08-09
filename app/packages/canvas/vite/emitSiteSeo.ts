import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { injectPrerenderedPageHtml } from '../src/ui/features/docs/seo/prerenderHtml.ts';
import {
  buildSitemapXml,
  listIndexableSeoPaths,
  resolvePageSeo,
} from '../src/ui/features/docs/seo/siteSeo.ts';

/** Product/nav links embedded in prerendered HTML for crawlers. */
function listPrerenderNavLinks(): Array<{ href: string; label: string }> {
  return [
    { href: '/', label: 'ArchLens home' },
    { href: '/guide/canvas', label: 'ArchLens Canvas' },
    { href: '/guide/cli', label: 'ArchLens CLI' },
    { href: '/guide/tracelens', label: 'TraceLens' },
    { href: '/guide/chaoslens', label: 'ChaosLens' },
    { href: '/guide/advicelens', label: 'AdviceLens' },
    { href: '/guide/schema', label: 'BlueprintSpec' },
    { href: '/journeys', label: 'Interface tour' },
    { href: '/guide', label: 'Product guide' },
  ];
}

function outPathForRoute(outDir: string, routePath: string): string {
  if (routePath === '/') return path.join(outDir, 'index.html');
  return path.join(outDir, routePath.replace(/^\//, ''), 'index.html');
}

/** Emit sitemap.xml and prerendered HTML shells for indexable marketing/docs routes. */
export function emitSiteSeo(): Plugin {
  let outDir = 'dist';
  let resolvedBase = '/';
  let shouldEmit = false;

  return {
    name: 'emit-site-seo',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      resolvedBase = config.base || '/';
      // Vitest loads the Vite config with a dummy outDir - never emit there.
      shouldEmit = config.command === 'build' && !process.env.VITEST;
    },
    closeBundle() {
      if (!shouldEmit) return;
      const indexPath = path.join(outDir, 'index.html');
      if (!fs.existsSync(indexPath)) {
        this.warn(`emit-site-seo: missing ${indexPath}; skip prerender`);
        return;
      }

      const shell = fs.readFileSync(indexPath, 'utf8');
      const paths = listIndexableSeoPaths();
      const nav = listPrerenderNavLinks();
      const lastmod = new Date().toISOString().slice(0, 10);

      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), buildSitemapXml(paths, lastmod), 'utf8');

      for (const routePath of paths) {
        // Base-path deployments keep a single shell; absolute product SEO targets apex.
        if (resolvedBase !== '/') continue;
        const seo = resolvePageSeo(routePath);
        const html = injectPrerenderedPageHtml(shell, seo, nav);
        const target = outPathForRoute(outDir, routePath);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, html, 'utf8');
      }
    },
  };
}
