import { describe, it, expect, afterAll } from 'vitest';
import postgres from 'postgres';
import { setupTestDatabase, cleanupTestDatabase } from '../test-utils.js';

describe('Database migrations', () => {
  let sql: ReturnType<typeof postgres>;

  afterAll(async () => {
    if (sql) await cleanupTestDatabase(sql);
  });

  it('should apply all migrations without error', async () => {
    // If any migration fails, setupTestDatabase throws and the test fails.
    await expect(setupTestDatabase().then((r) => { sql = r.sql; return r; }))
      .resolves.toBeDefined();
  });

  it('should have pgvector extension enabled', async () => {
    if (!sql) ({ sql } = await setupTestDatabase());

    const result = await sql<{ extname: string }[]>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;

    expect(result).toHaveLength(1);
    expect(result[0].extname).toBe('vector');
  });
});
