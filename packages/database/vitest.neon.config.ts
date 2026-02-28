import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.neon.test.ts'],
    environment: 'node',
    // Network calls to Neon need extra time
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
