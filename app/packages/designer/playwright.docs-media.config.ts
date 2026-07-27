import { defineConfig, devices } from '@playwright/test';

/** Opt-in Playwright config for recording product-guide GIFs into docs/screenshots/. */
export default defineConfig({
  testDir: './tests/docs-media',
  globalTeardown: './tests/docs-media/globalTeardown.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5188',
    trace: 'off',
    screenshot: 'off',
    actionTimeout: 30_000,
    video: {
      mode: 'on',
      size: { width: 1280, height: 720 },
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  webServer: {
    command: 'pnpm dev --port 5188',
    url: 'http://localhost:5188',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
