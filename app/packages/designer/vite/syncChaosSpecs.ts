import path from 'node:path';
import fs from 'node:fs';
import type { Plugin } from 'vite';
import {
  toChaosSpecCatalogEntry,
  sortChaosSpecCatalogEntries,
} from '../../core/src/resilience/chaosSpecCatalog.ts';
import { parseChaosSpecFromYaml } from '../../core/src/resilience/chaosSpecDocument.ts';
import { bundledChaosSpecsDest, repoChaosSpecs } from './paths.ts';

function collectChaosSpecPaths(srcDir: string): string[] {
  if (!fs.existsSync(srcDir)) return [];
  return fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter(
      entry => entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))
    )
    .map(entry => entry.name)
    .sort();
}

/**
 * Mirror repo `chaos-specs/` into `public/bundled-chaos-specs/` for the Canvas catalog picker.
 * Emits `catalog.json` with metadata so the picker can list scenarios without fetching every YAML.
 */
export function syncBundledChaosSpecs(): Plugin {
  let lastSyncKey = '';

  const sync = () => {
    if (!fs.existsSync(repoChaosSpecs)) {
      console.warn(`[sync-bundled-chaos-specs] Missing ${repoChaosSpecs}; skipping`);
      return;
    }

    const paths = collectChaosSpecPaths(repoChaosSpecs);
    const syncKey = paths
      .map(relativePath => {
        const stat = fs.statSync(path.join(repoChaosSpecs, relativePath));
        return `${relativePath}:${stat.size}:${Math.trunc(stat.mtimeMs)}`;
      })
      .join('\n');
    const catalogPath = path.join(bundledChaosSpecsDest, 'catalog.json');
    if (syncKey === lastSyncKey && fs.existsSync(catalogPath)) {
      return;
    }

    fs.rmSync(bundledChaosSpecsDest, { recursive: true, force: true });
    fs.mkdirSync(bundledChaosSpecsDest, { recursive: true });

    const entries = [];
    for (const relativePath of paths) {
      const content = fs.readFileSync(path.join(repoChaosSpecs, relativePath), 'utf8');
      fs.writeFileSync(path.join(bundledChaosSpecsDest, relativePath), content);
      try {
        const document = parseChaosSpecFromYaml(content);
        entries.push(toChaosSpecCatalogEntry(relativePath, document));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[sync-bundled-chaos-specs] Skipping ${relativePath}: ${message}`);
      }
    }

    fs.writeFileSync(
      catalogPath,
      `${JSON.stringify({ entries: sortChaosSpecCatalogEntries(entries) }, null, 2)}\n`
    );
    lastSyncKey = syncKey;
  };

  return {
    name: 'sync-bundled-chaos-specs',
    configResolved: sync,
    buildStart: sync,
    configureServer(server) {
      sync();
      server.watcher.unwatch(bundledChaosSpecsDest);
    },
  };
}
