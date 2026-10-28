import path from 'node:path';
import fs from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { emitSiteSeo } from './vite/emitSiteSeo';
import {
  emitVersionJson,
  injectBuildIdMeta,
  resolveDeployIdentity,
} from './vite/injectBuildIdMeta';
import { canvasPackageRoot, repoDocs } from './vite/paths';
import { syncBundledBlueprints } from './vite/syncBundledBlueprints';
import { syncBundledChaosSpecs } from './vite/syncChaosSpecs';
import { syncDocsAssets } from './vite/syncDocsAssets';
import { syncJsonSchemas } from './vite/syncJsonSchemas';
import { syncTreeSitterWasms } from './vite/syncTreeSitterWasms';
import { sanitizePrecacheManifest } from './vite/rewritePrecacheHtmlUrls';

const base = process.env.VITE_BASE || '/';
const deployIdentity = resolveDeployIdentity();
const appBuildId = deployIdentity.buildId;
const appPackageVersion = JSON.parse(
  fs.readFileSync(path.join(canvasPackageRoot, 'package.json'), 'utf8')
).version as string;

export default defineConfig({
  base,
  // Project API key is a public phc_ token; expose only POSTHOG_TOKEN / POSTHOG_HOST.
  envPrefix: ['VITE_', 'POSTHOG_TOKEN', 'POSTHOG_HOST'],
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
    emitVersionJson(deployIdentity),
    emitSiteSeo(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon.png', 'icons/apple-touch-icon-dark.png'],
      manifest: {
        name: 'ArchLens',
        short_name: 'ArchLens',
        description:
          'ArchLens maps your codebase as an interactive architecture diagram - explore systems, containers and components.',
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
      injectManifest: {
        // App shell + hashed bundles. Precache catalog + ArchLens context + golden/stress
        // demo YAML only (keep in sync with BUNDLED_PRELOAD_PREFIXES in bundledSamplePreload.ts).
        // Remaining /bundled-blueprints/* stay on CacheFirst after first ad-hoc fetch.
        globPatterns: [
          '**/*.{js,css,ico,svg,woff2,webmanifest,png}',
          'bundled-blueprints/catalog.json',
          'bundled-blueprints/golden-journey/**/*.{yaml,yml}',
          'bundled-blueprints/chaoslens-stress/**/*.{yaml,yml}',
          'bundled-blueprints/advicelens-stress/**/*.{yaml,yml}',
          'bundled-chaos-specs/catalog.json',
          'bundled-chaos-specs/**/*.{yaml,yml}',
        ],
        // Docs screenshots + schema pack are large and non-critical offline.
        // Do not glob-ignore all bundled-blueprints - that would drop the preload globs above.
        // Pages pretty-URLs 308 every */index.html; Workbox install fails on those redirects.
        // WASM (~14MB tree-sitter + chaoslens) is CacheFirst after first use — precaching it
        // fails Firefox install (MZW-104) even after HTML 308s were removed (MZW-102).
        globIgnores: [
          '**/docs-assets/**',
          '**/schemas/**',
          '**/version.json',
          '**/*.html',
          '**/*.wasm',
        ],
        // Navigation shell is `/` (not index.html). Pages 308s /index.html and a
        // redirected precache response fails install. src/sw.ts serves that shell
        // and asks for text/html so Cloudflare can inject the analytics beacon.
        additionalManifestEntries: [{ url: '/', revision: appBuildId }],
        // Pretty-URLs also 308 globbed folder index.html precache entries.
        // Rewrite those to the directory URL that returns 200 so install can cache them.
        manifestTransforms: [async manifest => ({ manifest: sanitizePrecacheManifest(manifest) })],
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
    ...(process.env.CI ? { maxWorkers: '100%' as const } : {}),
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'cobertura', 'json-summary', 'json'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/setupTests.ts',
        '**/test/**',
        '**/tests/**',
        '**/scripts/**',
        '**/vite.config.*',
        '**/vitest.config.*',
        '**/.vite/**',
        '**/vite/**',
        '**/*.d.ts',
      ],
    },
  },
});
