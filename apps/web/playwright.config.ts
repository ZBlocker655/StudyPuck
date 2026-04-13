import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const managedServer = process.env.PLAYWRIGHT_MANAGED_SERVER === '1';
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://test_user:test_password@localhost:5433/studypuck_test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`,
    trace: 'on-first-retry',
  },
  ...(managedServer
    ? {}
    : {
        webServer: {
          command: `pnpm db:migrate && pnpm exec vite dev --host 127.0.0.1 --port ${port} --strictPort`,
          port,
          reuseExistingServer: false,
          timeout: 180_000,
          env: {
            ...process.env,
            DATABASE_URL: testDatabaseUrl,
            E2E_TEST_MODE: 'enabled',
          },
        },
      }),
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
