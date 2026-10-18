import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'collab',
    ...(process.env.CI ? { maxWorkers: '100%' as const } : {}),
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
