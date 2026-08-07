import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'src/test',
  testMatch: '**/docs-media.spec.ts',
  timeout: 120_000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
});
