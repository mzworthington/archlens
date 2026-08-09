import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/e2e-remote-catalog.spec.ts', '**/docs-media/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 180_000,
  reporter: [['list'], ['html']],
  use: {
    baseURL: 'http://localhost:5188',
    navigationTimeout: 60_000,
    trace: 'on-first-retry',
    /** Full-page shot attached to the HTML report when a test fails. */
    screenshot: 'only-on-failure',
    /** WebM per test kept when the run fails (also in CI artifacts). */
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2880, height: 1864 },
      },
    },
  ],
  webServer: {
    command: 'pnpm dev --port 5188',
    url: 'http://localhost:5188',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
    // Keep e2e on mirrored samples/ even when .env.development points at R2.
    env: {
      ...process.env,
      VITE_REMOTE_CATALOG_BASE_URL: '',
    },
  },
});
