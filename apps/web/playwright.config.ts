import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://test_user:test_password@localhost:5433/studypuck_test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `pnpm db:migrate && pnpm dev -- --host 127.0.0.1 --port ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      E2E_TEST_MODE: 'enabled',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
