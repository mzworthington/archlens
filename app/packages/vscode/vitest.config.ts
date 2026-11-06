import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'vscode',
    ...(process.env.CI ? { maxWorkers: '100%' as const } : {}),
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
