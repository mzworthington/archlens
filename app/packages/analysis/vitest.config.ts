import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'analysis',
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
