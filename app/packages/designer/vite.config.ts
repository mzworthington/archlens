import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import {
  TREE_SITTER_HCL_PACKAGE_LANGUAGES,
  TREE_SITTER_WASMS_PACKAGE_LANGUAGES,
  wasmFileName,
} from '../core/src/lib/treeSitterLanguages.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoDocs = path.resolve(__dirname, '../../../docs');
const repoSchemas = path.resolve(__dirname, '../../../schemas');
const repoBlueprints = path.resolve(__dirname, '../../../blueprints');
const bundledBlueprintsDest = path.resolve(__dirname, 'public/bundled-blueprints');
const base = process.env.VITE_BASE || '/';

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

/**
 * Mirror repo `blueprints/` into `public/bundled-blueprints/` for static demo serving.
 * Must sync in `configResolved` so files exist before Vite builds its publicFiles allowlist
 * (files created later in configureServer are invisible to servePublicMiddleware).
 */
function syncBundledBlueprints(): Plugin {
  let lastSyncKey = '';

  const sync = () => {
    if (!fs.existsSync(repoBlueprints)) {
      throw new Error(`Missing repo blueprints directory: ${repoBlueprints}`);
    }

    const manifestPaths = collectBundledBlueprintPaths(repoBlueprints).sort();
    const syncKey = manifestPaths.join('\n');
    if (
      syncKey === lastSyncKey &&
      fs.existsSync(path.join(bundledBlueprintsDest, 'manifest.json'))
    ) {
      return;
    }

    fs.rmSync(bundledBlueprintsDest, { recursive: true, force: true });
    copyBundledBlueprintsTree(repoBlueprints, bundledBlueprintsDest);
    fs.writeFileSync(
      path.join(bundledBlueprintsDest, 'manifest.json'),
      `${JSON.stringify(manifestPaths, null, 2)}\n`
    );
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

function resolveBuildId(): string {
  const fromCi = process.env.GITHUB_SHA?.slice(0, 12);
  if (fromCi) return fromCi;
  if (process.env.VITE_APP_BUILD_ID) return process.env.VITE_APP_BUILD_ID;
  return `local-${Date.now().toString(36)}`;
}

const appBuildId = resolveBuildId();
const appPackageVersion = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'))
  .version as string;

/** Inject `<meta name="app-build-id">` for deploy-time version checks (index.html fetch). */
function injectBuildIdMeta(): Plugin {
  return {
    name: 'inject-build-id-meta',
    transformIndexHtml(html) {
      if (html.includes('name="app-build-id"')) return html;
      return html.replace(
        '<head>',
        `<head>\n    <meta name="app-build-id" content="${appBuildId}" />`
      );
    },
  };
}

/** Copy docs screenshots (and other static assets) into public for production & dev. */
function syncDocsAssets(): Plugin {
  const dest = path.resolve(__dirname, 'public/docs-assets');

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

/**
 * Publish JSON Schema for external IDE validation under /schemas/v{n}/ and /schemas/latest/.
 * Source of truth: repo `schemas/` (generated from Zod in @archlens/core).
 */
function syncJsonSchemas(): Plugin {
  const destRoot = path.resolve(__dirname, 'public/schemas');

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

/** Copy tree-sitter runtime + language WASM parsers for in-browser highlighting. */
function syncTreeSitterWasms(): Plugin {
  const dest = path.resolve(__dirname, 'public/tree-sitter');

  const sync = () => {
    const require = createRequire(import.meta.url);
    const webTreeSitterPkg = require.resolve('web-tree-sitter/package.json');
    const runtimeWasm = path.join(path.dirname(webTreeSitterPkg), 'tree-sitter.wasm');
    const wasmsOut = path.join(
      path.dirname(require.resolve('tree-sitter-wasms/package.json')),
      'out'
    );
    const hclPkgDir = path.dirname(
      require.resolve('@tree-sitter-grammars/tree-sitter-hcl/package.json')
    );

    fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(runtimeWasm, path.join(dest, 'tree-sitter.wasm'));

    for (const lang of TREE_SITTER_WASMS_PACKAGE_LANGUAGES) {
      const src = path.join(wasmsOut, wasmFileName(lang));
      if (!fs.existsSync(src)) {
        throw new Error(`Missing tree-sitter WASM: ${src}`);
      }
      fs.copyFileSync(src, path.join(dest, wasmFileName(lang)));
    }

    for (const lang of TREE_SITTER_HCL_PACKAGE_LANGUAGES) {
      const src = path.join(hclPkgDir, wasmFileName(lang));
      if (!fs.existsSync(src)) {
        throw new Error(`Missing tree-sitter WASM: ${src}`);
      }
      fs.copyFileSync(src, path.join(dest, wasmFileName(lang)));
    }
  };

  return {
    name: 'sync-tree-sitter-wasms',
    configResolved: sync,
    buildStart: sync,
    configureServer() {
      sync();
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base,
  define: {
    __APP_BUILD_ID__: JSON.stringify(appBuildId),
    __APP_PACKAGE_VERSION__: JSON.stringify(appPackageVersion),
  },
  plugins: [
    react(),
    tailwindcss(),
    syncBundledBlueprints(),
    syncDocsAssets(),
    syncJsonSchemas(),
    syncTreeSitterWasms(),
    injectBuildIdMeta(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon.png', 'icons/apple-touch-icon-dark.png'],
      manifest: {
        name: 'ArchLens',
        short_name: 'ArchLens',
        description:
          'ArchLens maps your codebase as an interactive C4-style diagram - explore systems, containers, and components.',
        theme_color: '#040914',
        background_color: '#040914',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icons/pwa-192x192-dark.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512x512-dark.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512x512-dark.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell + hashed bundles. Skip docs screenshots (large, non-critical offline).
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2,webmanifest,png,wasm}'],
        // Demo YAML is large; cache on first use instead of bloating the install precache.
        globIgnores: ['**/docs-assets/**', '**/schemas/**', '**/bundled-blueprints/**'],
        navigateFallback: 'index.html',
        // Keep /schemas/* and /bundled-blueprints/* as real assets, not the SPA shell.
        navigateFallbackDenylist: [/^\/schemas\//, /^\/bundled-blueprints\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/bundled-blueprints/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'bundled-blueprints',
              expiration: {
                maxEntries: 2000,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
      },
    }),
  ],
  build: {
    rollupOptions: {
      // web-tree-sitter ships Emscripten glue that uses direct eval for WASM init
      // (ASM_CONSTS wiring). Strings are library-generated, not user input.
      onwarn(
        warning: { code?: string; id?: string; message?: string },
        defaultHandler: (warning: { code?: string; id?: string; message?: string }) => void
      ) {
        const fromWebTreeSitter =
          warning.id?.includes('web-tree-sitter') || warning.message?.includes('web-tree-sitter');
        if (warning.code === 'EVAL' && fromWebTreeSitter) {
          return;
        }
        defaultHandler(warning);
      },
    },
  },
  resolve: {
    alias: {
      '@docs': repoDocs,
    },
  },
  server: {
    fs: {
      allow: ['../../..'],
    },
  },
  test: {
    name: 'app',
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/**'],
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'cobertura', 'json-summary', 'json'],
      include: ['src/**/*'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/setupTests.ts'],
    },
  },
} as any);
