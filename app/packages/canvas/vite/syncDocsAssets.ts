import path from 'node:path';
import fs from 'node:fs';
import type { Plugin } from 'vite';
import { canvasPackageRoot, repoDocs } from './paths';

/** GIFs move to the docs-media host once VITE_DOCS_MEDIA_BASE_URL is set, so Pages never uploads them. */
export function shouldCopyDocsAsset(
  name: string,
  mediaBase = process.env.VITE_DOCS_MEDIA_BASE_URL
): boolean {
  if (mediaBase?.trim() && name.toLowerCase().endsWith('.gif')) return false;
  return true;
}

/** Copy docs screenshots (and other static assets) into public for production & dev. */
export function syncDocsAssets(): Plugin {
  const dest = path.resolve(canvasPackageRoot, 'public/docs-assets');

  const sync = () => {
    const screenshots = path.join(repoDocs, 'screenshots');
    if (!fs.existsSync(screenshots)) return;
    fs.mkdirSync(path.join(dest, 'screenshots'), { recursive: true });
    for (const name of fs.readdirSync(screenshots)) {
      const from = path.join(screenshots, name);
      if (!shouldCopyDocsAsset(name) || !fs.statSync(from).isFile()) continue;
      fs.copyFileSync(from, path.join(dest, 'screenshots', name));
    }
  };

  return {
    name: 'sync-docs-assets',
    configResolved: sync,
    buildStart: sync,
    configureServer() {
      sync();
    },
  };
}
