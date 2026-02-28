import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import { setupTestDatabase, cleanupTestDatabase, resetTestTables, type TestDb } from '../test-utils.js';
import { users } from '../schema.js';
import { eq } from 'drizzle-orm';

describe('User database operations', () => {
  let db: TestDb;
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    ({ db, sql } = await setupTestDatabase());
  });

  afterAll(async () => {
    if (sql) await cleanupTestDatabase(sql);
  });

  beforeEach(async () => {
    await resetTestTables(db);
  });

  it('should insert and retrieve a user', async () => {
    const userData = {
      userId: 'auth0|test123',
      email: 'test@example.com',
    };

    await db.insert(users).values(userData);

    const [retrieved] = await db
      .select()
      .from(users)
      .where(eq(users.userId, userData.userId));

    expect(retrieved).toBeDefined();
    expect(retrieved.email).toBe(userData.email);
    expect(retrieved.createdAt).toBeDefined();
  });

  it('should enforce unique email constraint', async () => {
    const userData = { userId: 'auth0|user1', email: 'duplicate@example.com' };
    await db.insert(users).values(userData);

    await expect(
      db.insert(users).values({ userId: 'auth0|user2', email: 'duplicate@example.com' })
    ).rejects.toThrow();
  });

  it('should delete a user', async () => {
    await db.insert(users).values({ userId: 'auth0|todelete', email: 'delete@example.com' });

    await db.delete(users).where(eq(users.userId, 'auth0|todelete'));

    const result = await db.select().from(users).where(eq(users.userId, 'auth0|todelete'));
    expect(result).toHaveLength(0);
  });
});
