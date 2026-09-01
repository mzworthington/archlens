import path from 'node:path';
import fs from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { emitSiteSeo } from './vite/emitSiteSeo.ts';
import { injectBuildIdMeta, resolveBuildId } from './vite/injectBuildIdMeta.ts';
import { canvasPackageRoot, repoDocs } from './vite/paths.ts';
import { syncBundledBlueprints } from './vite/syncBundledBlueprints.ts';
import { syncBundledChaosSpecs } from './vite/syncChaosSpecs.ts';
import { syncDocsAssets } from './vite/syncDocsAssets.ts';
import { syncJsonSchemas } from './vite/syncJsonSchemas.ts';
import { syncTreeSitterWasms } from './vite/syncTreeSitterWasms.ts';

const base = process.env.VITE_BASE || '/';
const appBuildId = resolveBuildId();
const appPackageVersion = JSON.parse(
  fs.readFileSync(path.join(canvasPackageRoot, 'package.json'), 'utf8')
).version as string;

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
    syncBundledChaosSpecs(),
    syncDocsAssets(),
    syncJsonSchemas(),
    syncTreeSitterWasms(),
    injectBuildIdMeta(appBuildId),
    emitSiteSeo(),
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
        // App shell + hashed bundles. Precache catalog + ArchLens context + golden/stress
        // demo YAML only (keep in sync with BUNDLED_PRELOAD_PREFIXES in bundledSamplePreload.ts).
        // Remaining /bundled-blueprints/* stay on CacheFirst after first ad-hoc fetch.
        globPatterns: [
          '**/*.{js,css,html,ico,svg,woff2,webmanifest,png,wasm}',
          'bundled-blueprints/catalog.json',
          'bundled-blueprints/golden-journey/**/*.{yaml,yml}',
          'bundled-blueprints/chaoslens-stress/**/*.{yaml,yml}',
          'bundled-blueprints/advicelens-stress/**/*.{yaml,yml}',
          'bundled-chaos-specs/catalog.json',
          'bundled-chaos-specs/**/*.{yaml,yml}',
        ],
        // Docs screenshots + schema pack are large and non-critical offline.
        // Do not glob-ignore all bundled-blueprints - that would drop the preload globs above.
        globIgnores: ['**/docs-assets/**', '**/schemas/**'],
        // CF Pages 308s /index.html → /. Navigation requests have redirect
        // mode "manual"; a redirected SW response becomes net::ERR_FAILED.
        navigateFallback: '/',
        additionalManifestEntries: [{ url: '/', revision: appBuildId }],
        // Keep /schemas/*, /bundled-blueprints/*, /bundled-chaos-specs/*, and /assets/* as real assets.
        navigateFallbackDenylist: [
          /^\/schemas\//,
          /^\/bundled-blueprints\//,
          /^\/bundled-chaos-specs\//,
          /^\/assets\//,
          /^\/sitemap\.xml$/,
          /^\/robots\.txt$/,
        ],
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
          {
            urlPattern: ({ url }) => url.pathname.includes('/bundled-chaos-specs/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'bundled-chaos-specs',
              expiration: {
                maxEntries: 200,
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
    name: 'canvas',
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
});
