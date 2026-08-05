import path from 'node:path';
import fs from 'node:fs';
import type { Plugin } from 'vite';
import { canvasPackageRoot, repoDocs } from './paths.ts';

/** Copy docs screenshots (and other static assets) into public for production & dev. */
export function syncDocsAssets(): Plugin {
  const dest = path.resolve(canvasPackageRoot, 'public/docs-assets');

  const sync = () => {
    const screenshots = path.join(repoDocs, 'screenshots');
    if (!fs.existsSync(screenshots)) return;
    fs.mkdirSync(path.join(dest, 'screenshots'), { recursive: true });
    for (const name of fs.readdirSync(screenshots)) {
      const from = path.join(screenshots, name);
      if (fs.statSync(from).isFile()) {
        fs.copyFileSync(from, path.join(dest, 'screenshots', name));
      }
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
