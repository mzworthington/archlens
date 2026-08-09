import { defineConfig, devices } from '@playwright/test';

/**
 * Separate Playwright config so Vite boots with VITE_REMOTE_CATALOG_BASE_URL
 * pointing at the local ADR-0010 fixture server (not live R2).
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/e2e-remote-catalog.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 180_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5189',
    navigationTimeout: 60_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-remote-catalog',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2880, height: 1864 },
      },
    },
  ],
  webServer: [
    {
      command: 'node tests/fixtures/serve-remote-catalog.mjs',
      url: 'http://127.0.0.1:5199/latest/manifest.json',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'pnpm dev --port 5189',
      url: 'http://localhost:5189',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        ...process.env,
        VITE_REMOTE_CATALOG_BASE_URL: 'http://127.0.0.1:5199/',
      },
    },
  ],
});
