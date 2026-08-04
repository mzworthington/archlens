import { defineConfig, devices } from '@playwright/test';

/** Match designer e2e: ArchLens is built for large displays; record that viewport. */
const LARGE_DISPLAY = { width: 2880, height: 1864 } as const;

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
    navigationTimeout: 60_000,
    trace: 'off',
    screenshot: 'off',
    actionTimeout: 30_000,
    video: {
      mode: 'on',
      size: LARGE_DISPLAY,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: LARGE_DISPLAY,
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
