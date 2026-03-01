import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import { setupTestDatabase, cleanupTestDatabase, resetTestTables, type TestDb } from '../test-utils.js';
import { users } from '../schema.js';
import { eq } from 'drizzle-orm';
import { getUserByAuth0Id, createUser, upsertUser, updateLastLogin } from '../users.js';

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

describe('User profile operations', () => {
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

  it('getUserByAuth0Id returns user when found', async () => {
    await db.insert(users).values({ userId: 'auth0|findme', email: 'findme@example.com' });
    const user = await getUserByAuth0Id('auth0|findme', db);
    expect(user).not.toBeNull();
    expect(user!.email).toBe('findme@example.com');
  });

  it('getUserByAuth0Id returns null for unknown ID', async () => {
    const user = await getUserByAuth0Id('auth0|nobody', db);
    expect(user).toBeNull();
  });

  it('createUser stores name and pictureUrl', async () => {
    const created = await createUser({
      userId: 'auth0|withprofile',
      email: 'profile@example.com',
      name: 'Ada Lovelace',
      pictureUrl: 'https://example.com/avatar.jpg',
    }, db);

    expect(created.name).toBe('Ada Lovelace');
    expect(created.pictureUrl).toBe('https://example.com/avatar.jpg');
  });

  it('createUser sets lastLoginAt when provided', async () => {
    const before = new Date();
    const created = await createUser({
      userId: 'auth0|logintime',
      email: 'logintime@example.com',
      lastLoginAt: new Date(),
    }, db);
    const after = new Date();

    expect(created.lastLoginAt).not.toBeNull();
    expect(created.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(created.lastLoginAt!.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('upsertUser creates a new user on first call', async () => {
    const user = await upsertUser({
      userId: 'auth0|newuser',
      email: 'new@example.com',
      name: 'New User',
      pictureUrl: 'https://example.com/new.jpg',
    }, db);

    expect(user.userId).toBe('auth0|newuser');
    expect(user.name).toBe('New User');

    const allUsers = await db.select().from(users).where(eq(users.userId, 'auth0|newuser'));
    expect(allUsers).toHaveLength(1);
  });

  it('upsertUser updates lastLoginAt and profile on subsequent call without creating duplicate', async () => {
    await createUser({ userId: 'auth0|returning', email: 'returning@example.com', name: 'Old Name' }, db);

    const before = new Date();
    const updated = await upsertUser({
      userId: 'auth0|returning',
      email: 'returning@example.com',
      name: 'New Name',
      pictureUrl: 'https://example.com/updated.jpg',
    }, db);
    const after = new Date();

    expect(updated.name).toBe('New Name');
    expect(updated.pictureUrl).toBe('https://example.com/updated.jpg');
    expect(updated.lastLoginAt).not.toBeNull();
    expect(updated.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(updated.lastLoginAt!.getTime()).toBeLessThanOrEqual(after.getTime());

    const allUsers = await db.select().from(users).where(eq(users.userId, 'auth0|returning'));
    expect(allUsers).toHaveLength(1);
  });

  it('updateLastLogin sets timestamp and refreshes profile fields', async () => {
    await createUser({ userId: 'auth0|loginupdate', email: 'loginupdate@example.com' }, db);

    const before = new Date();
    const updated = await updateLastLogin('auth0|loginupdate', {
      name: 'Updated Name',
      pictureUrl: 'https://example.com/pic.jpg',
    }, db);
    const after = new Date();

    expect(updated).not.toBeNull();
    expect(updated!.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(updated!.lastLoginAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(updated!.name).toBe('Updated Name');
    expect(updated!.pictureUrl).toBe('https://example.com/pic.jpg');
  });
});
