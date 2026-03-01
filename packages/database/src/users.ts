import { eq, and } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { users, studyLanguages, type User, type NewUser, type StudyLanguage, type NewStudyLanguage } from './schema.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = PgDatabase<any, any, any>;

/** Returns the global lazily-initialised db, importing index only when needed */
async function globalDb(): Promise<AnyDb> {
  return (await import('./index.js')).db as AnyDb;
}

/**
 * User database operations
 * Handles CRUD operations for user profiles and languages.
 * All functions accept an optional `db` parameter for testability/dependency injection.
 * When omitted, the global Neon connection is used.
 */

export async function getUserByAuth0Id(auth0UserId: string, db?: AnyDb): Promise<User | null> {
  const conn = db ?? await globalDb();
  const result = await conn
    .select()
    .from(users)
    .where(eq(users.userId, auth0UserId))
    .limit(1);
  return result[0] || null;
}

export async function getUserByEmail(email: string, db?: AnyDb): Promise<User | null> {
  const conn = db ?? await globalDb();
  const result = await conn
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] || null;
}

export async function createUser(userData: NewUser, db?: AnyDb): Promise<User> {
  const conn = db ?? await globalDb();
  const result = await conn
    .insert(users)
    .values({
      ...userData,
      createdAt: new Date(),
    })
    .returning();
  return result[0]!;
}

export async function updateUser(
  userId: string,
  updates: Partial<Omit<NewUser, 'userId'>>,
  db?: AnyDb
): Promise<User | null> {
  const conn = db ?? await globalDb();
  const result = await conn
    .update(users)
    .set(updates)
    .where(eq(users.userId, userId))
    .returning();
  return result[0] || null;
}

/** Update last login timestamp and optionally refresh cached profile fields */
export async function updateLastLogin(
  userId: string,
  profileUpdates?: Pick<NewUser, 'name' | 'pictureUrl'>,
  db?: AnyDb
): Promise<User | null> {
  return updateUser(userId, { lastLoginAt: new Date(), ...profileUpdates }, db);
}

/**
 * Get or create user profile, always updating lastLoginAt for existing users.
 * Used in the auth sign-in flow to sync Auth0 profile data to the database.
 */
export async function upsertUser(userData: NewUser, db?: AnyDb): Promise<User> {
  const existingUser = await getUserByAuth0Id(userData.userId, db);
  if (existingUser) {
    const updated = await updateLastLogin(existingUser.userId, {
      name: userData.name,
      pictureUrl: userData.pictureUrl,
    }, db);
    return updated ?? existingUser;
  }
  return createUser({ ...userData, lastLoginAt: new Date() }, db);
}

// === Study Languages Operations ===

export async function getUserLanguages(userId: string, db?: AnyDb): Promise<StudyLanguage[]> {
  const conn = db ?? await globalDb();
  return conn
    .select()
    .from(studyLanguages)
    .where(eq(studyLanguages.userId, userId));
}

export async function getActiveUserLanguages(userId: string, db?: AnyDb): Promise<StudyLanguage[]> {
  const conn = db ?? await globalDb();
  return conn
    .select()
    .from(studyLanguages)
    .where(and(
      eq(studyLanguages.userId, userId),
      eq(studyLanguages.isActive, true)
    ));
}

export async function addStudyLanguage(languageData: NewStudyLanguage, db?: AnyDb): Promise<StudyLanguage> {
  const conn = db ?? await globalDb();
  const result = await conn
    .insert(studyLanguages)
    .values({
      ...languageData,
      createdAt: new Date(),
    })
    .returning();
  return result[0]!;
}

export async function updateStudyLanguage(
  userId: string,
  languageId: string,
  updates: Partial<Omit<NewStudyLanguage, 'userId' | 'languageId'>>,
  db?: AnyDb
): Promise<StudyLanguage | null> {
  const conn = db ?? await globalDb();
  const result = await conn
    .update(studyLanguages)
    .set(updates)
    .where(and(
      eq(studyLanguages.userId, userId),
      eq(studyLanguages.languageId, languageId)
    ))
    .returning();
  return result[0] || null;
}
