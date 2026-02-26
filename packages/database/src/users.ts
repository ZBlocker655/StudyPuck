import { eq, and } from 'drizzle-orm';
import { db } from './index.js';
import { users, studyLanguages, type User, type NewUser, type StudyLanguage, type NewStudyLanguage } from './schema.js';

/**
 * User database operations
 * Handles CRUD operations for user profiles and languages
 */

/**
 * Find a user by their Auth0 user ID
 * Used during authentication to get user profiles
 */
export async function getUserByAuth0Id(auth0UserId: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.userId, auth0UserId))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Find a user by their email address
 * Useful for user lookup and duplicate prevention
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Create a new user profile
 * Called when a user signs up through Auth0
 */
export async function createUser(userData: NewUser): Promise<User> {
  const result = await db
    .insert(users)
    .values({
      ...userData,
      createdAt: new Date(),
    })
    .returning();
  
  return result[0]!;
}

/**
 * Update user profile information
 * Allows users to modify their metadata, etc.
 */
export async function updateUser(userId: string, updates: Partial<Omit<NewUser, 'userId'>>): Promise<User | null> {
  const result = await db
    .update(users)
    .set(updates)
    .where(eq(users.userId, userId))
    .returning();
  
  return result[0] || null;
}

/**
 * Get or create user profile
 * Convenience function for authentication flow
 */
export async function upsertUser(userData: NewUser): Promise<User> {
  const existingUser = await getUserByAuth0Id(userData.userId);
  
  if (existingUser) {
    return existingUser;
  } else {
    return await createUser(userData);
  }
}

// === Study Languages Operations ===

/**
 * Get all study languages for a user
 */
export async function getUserLanguages(userId: string): Promise<StudyLanguage[]> {
  return await db
    .select()
    .from(studyLanguages)
    .where(eq(studyLanguages.userId, userId));
}

/**
 * Get active study languages for a user
 */
export async function getActiveUserLanguages(userId: string): Promise<StudyLanguage[]> {
  return await db
    .select()
    .from(studyLanguages)
    .where(and(
      eq(studyLanguages.userId, userId),
      eq(studyLanguages.isActive, true)
    ));
}

/**
 * Add a new study language for a user
 */
export async function addStudyLanguage(languageData: NewStudyLanguage): Promise<StudyLanguage> {
  const result = await db
    .insert(studyLanguages)
    .values({
      ...languageData,
      createdAt: new Date(),
    })
    .returning();
  
  return result[0]!;
}

/**
 * Update study language settings
 */
export async function updateStudyLanguage(
  userId: string, 
  languageId: string, 
  updates: Partial<Omit<NewStudyLanguage, 'userId' | 'languageId'>>
): Promise<StudyLanguage | null> {
  const result = await db
    .update(studyLanguages)
    .set(updates)
    .where(and(
      eq(studyLanguages.userId, userId),
      eq(studyLanguages.languageId, languageId)
    ))
    .returning();
  
  return result[0] || null;
}