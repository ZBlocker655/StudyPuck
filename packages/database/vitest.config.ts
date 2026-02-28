import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.neon.test.ts', 'node_modules/**'],
    environment: 'node',
    // Database operations need more time than unit tests
    testTimeout: 30000,
    hookTimeout: 30000,
    // Test files share a single Docker DB instance — run sequentially to avoid conflicts
    fileParallelism: false,
  },
});
