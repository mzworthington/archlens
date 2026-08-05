import path from 'node:path';
import fs from 'node:fs';
import type { Plugin } from 'vite';
import { buildWorkspaceCatalogFromYamlFiles } from '../../core/src/lib/buildWorkspaceCatalogFromYaml.ts';
import { bundledBlueprintsDest, bundledWorkspaceName, repoSamples } from './paths.ts';

/** Merge overlays (e.g. context-overlay.yaml) are not standalone SystemSchema docs. */
function isBundledBlueprintYaml(fileName: string): boolean {
  if (!(fileName.endsWith('.yaml') || fileName.endsWith('.yml'))) return false;
  return !fileName.includes('-overlay.');
}

function collectBundledBlueprintPaths(srcDir: string, relativePrefix = ''): string[] {
  const paths: string[] = [];
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const from = path.join(srcDir, entry.name);
    const relativePath = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      paths.push(...collectBundledBlueprintPaths(from, relativePath));
    } else if (entry.isFile() && isBundledBlueprintYaml(entry.name)) {
      paths.push(relativePath);
    }
  }
  return paths;
}

function copyBundledBlueprintsTree(srcDir: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const from = path.join(srcDir, entry.name);
    const to = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyBundledBlueprintsTree(from, to);
    } else if (entry.isFile() && isBundledBlueprintYaml(entry.name)) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
}

function bundledBlueprintsSyncKey(manifestPaths: string[]): string {
  return manifestPaths
    .map(relativePath => {
      const stat = fs.statSync(path.join(repoSamples, relativePath));
      return `${relativePath}:${stat.size}:${Math.trunc(stat.mtimeMs)}`;
    })
    .join('\n');
}

function writeBundledWorkspaceCatalog(manifestPaths: string[]): void {
  const files = manifestPaths.map(relativePath => ({
    path: relativePath,
    content: fs.readFileSync(path.join(repoSamples, relativePath), 'utf8'),
  }));
  const catalog = buildWorkspaceCatalogFromYamlFiles(files, bundledWorkspaceName, {
    onInvalid: (relativePath, error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[sync-bundled-blueprints] Skipping ${relativePath}: ${message}`);
    },
  });
  fs.writeFileSync(
    path.join(bundledBlueprintsDest, 'catalog.json'),
    `${JSON.stringify(catalog, null, 2)}\n`
  );
}

/**
 * Mirror repo `samples/` into `public/bundled-blueprints/` for static demo serving.
 * Must sync in `configResolved` so files exist before Vite builds its publicFiles allowlist
 * (files created later in configureServer are invisible to servePublicMiddleware).
 * Also emits `catalog.json` so the demo can open without fetching every YAML up front.
 */
export function syncBundledBlueprints(): Plugin {
  let lastSyncKey = '';

  const sync = () => {
    if (!fs.existsSync(repoSamples)) {
      throw new Error(`Missing repo samples directory: ${repoSamples}`);
    }

    const manifestPaths = collectBundledBlueprintPaths(repoSamples).sort();
    const syncKey = bundledBlueprintsSyncKey(manifestPaths);
    const manifestPath = path.join(bundledBlueprintsDest, 'manifest.json');
    const catalogPath = path.join(bundledBlueprintsDest, 'catalog.json');
    if (syncKey === lastSyncKey && fs.existsSync(manifestPath) && fs.existsSync(catalogPath)) {
      return;
    }

    fs.rmSync(bundledBlueprintsDest, { recursive: true, force: true });
    copyBundledBlueprintsTree(repoSamples, bundledBlueprintsDest);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifestPaths, null, 2)}\n`);
    writeBundledWorkspaceCatalog(manifestPaths);
    lastSyncKey = syncKey;
  };

  return {
    name: 'sync-bundled-blueprints',
    configResolved: sync,
    buildStart: sync,
    configureServer(server) {
      sync();
      server.watcher.unwatch(bundledBlueprintsDest);
    },
  };
}
