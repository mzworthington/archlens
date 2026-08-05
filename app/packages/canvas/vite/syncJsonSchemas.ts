import path from 'node:path';
import fs from 'node:fs';
import type { Plugin } from 'vite';
import { canvasPackageRoot, repoSchemas } from './paths.ts';

/**
 * Publish JSON Schema for external IDE validation under /schemas/v{n}/ and /schemas/latest/.
 * Source of truth: repo `schemas/` (generated from Zod in @archlens/core).
 */
export function syncJsonSchemas(): Plugin {
  const destRoot = path.resolve(canvasPackageRoot, 'public/schemas');

  const sync = () => {
    if (!fs.existsSync(repoSchemas)) return;
    const channels = fs
      .readdirSync(repoSchemas, { withFileTypes: true })
      .filter(d => d.isDirectory() && (d.name === 'latest' || /^v\d+$/.test(d.name)))
      .map(d => d.name);

    for (const channel of channels) {
      const srcDir = path.join(repoSchemas, channel);
      if (!fs.existsSync(srcDir)) continue;
      const destDir = path.join(destRoot, channel);
      fs.mkdirSync(destDir, { recursive: true });
      for (const name of fs.readdirSync(srcDir)) {
        if (!name.endsWith('.schema.json')) continue;
        fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name));
      }
    }
  };

  return {
    name: 'sync-json-schemas',
    // Before Vite's publicFiles scan — otherwise /schemas/* falls through to index.html.
    configResolved: sync,
    buildStart: sync,
    configureServer() {
      sync();
    },
  };
}
