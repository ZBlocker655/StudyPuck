import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { db } from './index.js';
import { cards, groups, cardGroups, type Card, type NewCard, type Group, type NewGroup, type CardGroup, type NewCardGroup } from './schema.js';

/**
 * Card and Group database operations
 * Handles CRUD operations for study content
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = PgDatabase<any, any, any>;

function getConn(database?: AnyDb) {
  return database ?? (db as AnyDb);
}

// === Card Operations ===

/**
 * Get all active cards for a user+language
 */
export async function getActiveCards(userId: string, languageId: string): Promise<Card[]> {
  return await db
    .select()
    .from(cards)
    .where(and(
      eq(cards.userId, userId),
      eq(cards.languageId, languageId),
      eq(cards.status, 'active')
    ))
    .orderBy(desc(cards.updatedAt));
}

/**
 * Get cards by status for a user+language
 */
export async function getCardsByStatus(userId: string, languageId: string, status: string): Promise<Card[]> {
  return await db
    .select()
    .from(cards)
    .where(and(
      eq(cards.userId, userId),
      eq(cards.languageId, languageId),
      eq(cards.status, status)
    ))
    .orderBy(desc(cards.updatedAt));
}

/**
 * Get a specific card by ID
 */
export async function getCard(userId: string, languageId: string, cardId: string): Promise<Card | null> {
  const result = await db
    .select()
    .from(cards)
    .where(and(
      eq(cards.userId, userId),
      eq(cards.languageId, languageId),
      eq(cards.cardId, cardId)
    ))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Create a new card
 */
export async function createCard(cardData: NewCard): Promise<Card> {
  const result = await db
    .insert(cards)
    .values({
      ...cardData,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  
  return result[0]!;
}

/**
 * Update a card
 */
export async function updateCard(
  userId: string, 
  languageId: string, 
  cardId: string, 
  updates: Partial<Omit<NewCard, 'userId' | 'languageId' | 'cardId'>>,
  database?: AnyDb
): Promise<Card | null> {
  const result = await getConn(database)
    .update(cards)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(and(
      eq(cards.userId, userId),
      eq(cards.languageId, languageId),
      eq(cards.cardId, cardId)
    ))
    .returning();
  
  return result[0] || null;
}

/**
 * Update card status (draft -> active, active -> archived, etc.)
 */
export async function updateCardStatus(
  userId: string, 
  languageId: string, 
  cardId: string, 
  status: string
): Promise<Card | null> {
  return await updateCard(userId, languageId, cardId, { status });
}

/**
 * Soft-delete a card by setting status = 'deleted' and deleted_at = now().
 * SRS metadata (card_review_srs, translation_drills_srs) is preserved.
 */
export async function deleteCard(
  userId: string,
  languageId: string,
  cardId: string
): Promise<Card | null> {
  const now = new Date();
  const result = await db
    .update(cards)
    .set({
      status: 'deleted',
      deletedAt: now,
      updatedAt: now,
    })
    .where(and(
      eq(cards.userId, userId),
      eq(cards.languageId, languageId),
      eq(cards.cardId, cardId)
    ))
    .returning();

  return result[0] || null;
}

/**
 * Find similar cards using vector similarity search
 * Returns cards ordered by similarity (cosine distance)
 */
export async function findSimilarCards(
  userId: string,
  languageId: string,
  queryEmbedding: number[], 
  limit: number = 10,
  threshold: number = 0.7
): Promise<Array<Card & { similarity: number }>> {
  const result = await db
    .select({
      userId: cards.userId,
      languageId: cards.languageId,
      cardId: cards.cardId,
      content: cards.content,
      status: cards.status,
      cardType: cards.cardType,
      meaning: cards.meaning,
      examples: cards.examples,
      mnemonics: cards.mnemonics,
      llmInstructions: cards.llmInstructions,
      embedding: cards.embedding,
      embeddingModel: cards.embeddingModel,
      embeddingGeneratedAt: cards.embeddingGeneratedAt,
      createdAt: cards.createdAt,
      updatedAt: cards.updatedAt,
      deletedAt: cards.deletedAt,
      metadata: cards.metadata,
      similarity: sql<number>`1 - (${cards.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
    })
    .from(cards)
    .where(and(
      eq(cards.userId, userId),
      eq(cards.languageId, languageId),
      eq(cards.status, 'active'),
      sql`${cards.embedding} IS NOT NULL`,
      sql`1 - (${cards.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector) > ${threshold}`
    ))
    .orderBy(desc(sql`1 - (${cards.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`))
    .limit(limit);
  
  return result;
}

// === Group Operations ===

/**
 * Get all groups for a user+language
 */
export async function getGroups(userId: string, languageId: string, database?: AnyDb): Promise<Group[]> {
  return await getConn(database)
    .select()
    .from(groups)
    .where(and(
      eq(groups.userId, userId),
      eq(groups.languageId, languageId)
    ))
    .orderBy(groups.groupName);
}

/**
 * Get a specific group by ID
 */
export async function getGroup(userId: string, languageId: string, groupId: string, database?: AnyDb): Promise<Group | null> {
  const result = await getConn(database)
    .select()
    .from(groups)
    .where(and(
      eq(groups.userId, userId),
      eq(groups.languageId, languageId),
      eq(groups.groupId, groupId)
    ))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Create a new group
 */
export async function createGroup(groupData: NewGroup, database?: AnyDb): Promise<Group> {
  const result = await getConn(database)
    .insert(groups)
    .values({
      ...groupData,
      createdAt: new Date(),
    })
    .returning();
  
  return result[0]!;
}

/**
 * Update a group
 */
export async function updateGroup(
  userId: string, 
  languageId: string, 
  groupId: string, 
  updates: Partial<Omit<NewGroup, 'userId' | 'languageId' | 'groupId'>>,
  database?: AnyDb
): Promise<Group | null> {
  const result = await getConn(database)
    .update(groups)
    .set(updates)
    .where(and(
      eq(groups.userId, userId),
      eq(groups.languageId, languageId),
      eq(groups.groupId, groupId)
    ))
    .returning();
  
  return result[0] || null;
}

/**
 * Find similar groups using vector similarity search
 * Useful for suggesting groups when creating cards
 */
export async function findSimilarGroups(
  userId: string,
  languageId: string,
  queryEmbedding: number[], 
  limit: number = 5,
  threshold: number = 0.6
): Promise<Array<Group & { similarity: number }>> {
  const result = await db
    .select({
      userId: groups.userId,
      languageId: groups.languageId,
      groupId: groups.groupId,
      groupName: groups.groupName,
      description: groups.description,
      embedding: groups.embedding,
      embeddingModel: groups.embeddingModel,
      embeddingGeneratedAt: groups.embeddingGeneratedAt,
      createdAt: groups.createdAt,
      metadata: groups.metadata,
      similarity: sql<number>`1 - (${groups.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`,
    })
    .from(groups)
    .where(and(
      eq(groups.userId, userId),
      eq(groups.languageId, languageId),
      sql`${groups.embedding} IS NOT NULL`,
      sql`1 - (${groups.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector) > ${threshold}`
    ))
    .orderBy(desc(sql`1 - (${groups.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`))
    .limit(limit);
  
  return result;
}

// === Card-Group Relationship Operations ===

/**
 * Add a card to a group
 */
export async function addCardToGroup(cardGroupData: NewCardGroup, database?: AnyDb): Promise<CardGroup> {
  const result = await getConn(database)
    .insert(cardGroups)
    .values({
      ...cardGroupData,
      assignedAt: new Date(),
    })
    .returning();
  
  return result[0]!;
}

/**
 * Remove a card from a group
 */
export async function removeCardFromGroup(
  userId: string, 
  languageId: string, 
  cardId: string, 
  groupId: string,
  database?: AnyDb
): Promise<void> {
  await getConn(database)
    .delete(cardGroups)
    .where(and(
      eq(cardGroups.userId, userId),
      eq(cardGroups.languageId, languageId),
      eq(cardGroups.cardId, cardId),
      eq(cardGroups.groupId, groupId)
    ));
}

/**
 * Get all cards in a group
 */
export async function getCardsInGroup(userId: string, languageId: string, groupId: string): Promise<Card[]> {
  const result = await db
    .select({
      userId: cards.userId,
      languageId: cards.languageId,
      cardId: cards.cardId,
      content: cards.content,
      status: cards.status,
      cardType: cards.cardType,
      meaning: cards.meaning,
      examples: cards.examples,
      mnemonics: cards.mnemonics,
      llmInstructions: cards.llmInstructions,
      embedding: cards.embedding,
      embeddingModel: cards.embeddingModel,
      embeddingGeneratedAt: cards.embeddingGeneratedAt,
      createdAt: cards.createdAt,
      updatedAt: cards.updatedAt,
      deletedAt: cards.deletedAt,
      metadata: cards.metadata,
    })
    .from(cards)
    .innerJoin(cardGroups, and(
      eq(cards.userId, cardGroups.userId),
      eq(cards.languageId, cardGroups.languageId),
      eq(cards.cardId, cardGroups.cardId)
    ))
    .where(and(
      eq(cardGroups.userId, userId),
      eq(cardGroups.languageId, languageId),
      eq(cardGroups.groupId, groupId),
      eq(cards.status, 'active')
    ))
    .orderBy(desc(cards.updatedAt));
  
  return result;
}

/**
 * Get all groups for a specific card
 */
export async function getCardGroups(userId: string, languageId: string, cardId: string, database?: AnyDb): Promise<Group[]> {
  const result = await getConn(database)
    .select({
      userId: groups.userId,
      languageId: groups.languageId,
      groupId: groups.groupId,
      groupName: groups.groupName,
      description: groups.description,
      embedding: groups.embedding,
      embeddingModel: groups.embeddingModel,
      embeddingGeneratedAt: groups.embeddingGeneratedAt,
      createdAt: groups.createdAt,
      metadata: groups.metadata,
    })
    .from(groups)
    .innerJoin(cardGroups, and(
      eq(groups.userId, cardGroups.userId),
      eq(groups.languageId, cardGroups.languageId),
      eq(groups.groupId, cardGroups.groupId)
    ))
    .where(and(
      eq(cardGroups.userId, userId),
      eq(cardGroups.languageId, languageId),
      eq(cardGroups.cardId, cardId)
    ))
    .orderBy(groups.groupName);
  
  return result;
}

export async function getCardGroupsForCards(
  userId: string,
  languageId: string,
  cardIds: string[],
  database?: AnyDb
): Promise<Map<string, Group[]>> {
  const groupsByCardId = new Map<string, Group[]>();

  if (cardIds.length === 0) {
    return groupsByCardId;
  }

  const rows = await getConn(database)
    .select({
      cardId: cardGroups.cardId,
      userId: groups.userId,
      languageId: groups.languageId,
      groupId: groups.groupId,
      groupName: groups.groupName,
      description: groups.description,
      embedding: groups.embedding,
      embeddingModel: groups.embeddingModel,
      embeddingGeneratedAt: groups.embeddingGeneratedAt,
      createdAt: groups.createdAt,
      metadata: groups.metadata,
    })
    .from(cardGroups)
    .innerJoin(groups, and(
      eq(groups.userId, cardGroups.userId),
      eq(groups.languageId, cardGroups.languageId),
      eq(groups.groupId, cardGroups.groupId)
    ))
    .where(and(
      eq(cardGroups.userId, userId),
      eq(cardGroups.languageId, languageId),
      inArray(cardGroups.cardId, cardIds)
    ))
    .orderBy(cardGroups.cardId, groups.groupName);

  for (const row of rows) {
    const existingGroups = groupsByCardId.get(row.cardId) ?? [];
    existingGroups.push({
      userId: row.userId,
      languageId: row.languageId,
      groupId: row.groupId,
      groupName: row.groupName,
      description: row.description,
      embedding: row.embedding,
      embeddingModel: row.embeddingModel,
      embeddingGeneratedAt: row.embeddingGeneratedAt,
      createdAt: row.createdAt,
      metadata: row.metadata,
    });
    groupsByCardId.set(row.cardId, existingGroups);
  }

  return groupsByCardId;
}
