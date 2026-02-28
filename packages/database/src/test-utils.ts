import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import * as schema from './schema.js';
import { users, studyLanguages } from './schema/users.js';
import { groups, cards, cardGroups } from './schema/cards.js';
import { inboxNotes, noteCardLinks, cardEntryDailyStats } from './schema/card-entry.js';
import { cardReviewSrs, cardReviewDailyStats } from './schema/card-review.js';
import {
  translationDrillSrs,
  translationDrillDrawPiles,
  translationDrillContext,
  translationDrillDailyStats,
} from './schema/translation-drills.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_TEST_URL =
  'postgresql://test_user:test_password@localhost:5433/studypuck_test';

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;
export type TestSql = ReturnType<typeof postgres>;

export async function setupTestDatabase(url?: string) {
  const connectionString = url ?? process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_URL;
  const sql = postgres(connectionString, { max: 1 });

  // Always start from a clean slate - resilient to dirty state from previous runs
  await sql`DROP SCHEMA IF EXISTS public CASCADE`;
  await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
  await sql`CREATE SCHEMA public`;
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;

  const db = drizzle(sql, { schema });

  await migrate(db, {
    migrationsFolder: resolve(__dirname, '../migrations'),
  });

  return { db, sql };
}

export async function cleanupTestDatabase(sql: TestSql) {
  await sql`DROP SCHEMA IF EXISTS public CASCADE`;
  // Also clear Drizzle's migration tracking so the next setup re-applies all migrations
  await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
  await sql`CREATE SCHEMA public`;
  // Recreate the extension so subsequent test files can run migrations
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  await sql.end();
}

/** Truncates all tables while preserving schema - faster than full cleanup for test isolation */
export async function resetTestTables(db: TestDb) {
  // Delete in reverse FK dependency order (leaf tables first, then parents)
  await db.delete(cardEntryDailyStats);
  await db.delete(cardReviewDailyStats);
  await db.delete(translationDrillDailyStats);
  await db.delete(translationDrillContext);
  await db.delete(translationDrillSrs);
  await db.delete(translationDrillDrawPiles);
  await db.delete(cardReviewSrs);
  await db.delete(noteCardLinks);
  await db.delete(inboxNotes);
  await db.delete(cardGroups);
  await db.delete(cards);
  await db.delete(groups);
  await db.delete(studyLanguages);
  await db.delete(users);
}
