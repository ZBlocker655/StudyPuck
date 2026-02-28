import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import * as schema from './schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Set up a Neon database branch for ephemeral integration testing.
 *
 * Usage: only in `*.neon.test.ts` files — see docs/ops/database-branching-guide.md
 * for the full ephemeral test lifecycle and naming conventions.
 *
 * Requires NEON_TEST_DATABASE_URL to be set (direct connection string for a
 * dedicated test branch — never production or development branches).
 */
export async function setupNeonTestDatabase(url?: string) {
  const connectionString = url ?? process.env.NEON_TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'NEON_TEST_DATABASE_URL is required for Neon integration tests. ' +
        'Create a test branch via: neon branches create test-issue-N --parent development'
    );
  }

  const sql = neon(connectionString);
  const db = drizzle(sql, { schema });

  await migrate(db, {
    migrationsFolder: resolve(__dirname, '../migrations'),
  });

  return { db, sql };
}
