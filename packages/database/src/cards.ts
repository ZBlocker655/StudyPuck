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

export type SupportedCardType = 'word' | 'pattern' | 'complex_prompt';

export type ActiveCardGroupSummary = Pick<Group, 'groupId' | 'groupName'>;

export type ActiveCardFilters = {
  search?: string;
  groupIds?: string[];
  cardType?: SupportedCardType | null;
  limit?: number;
  offset?: number;
};

export type ActiveCardListItem = Pick<Card, 'cardId' | 'content' | 'meaning' | 'cardType' | 'updatedAt'> & {
  groups: ActiveCardGroupSummary[];
};

export type ActiveCardDetail = Card & {
  groups: ActiveCardGroupSummary[];
};

export type GroupWithActiveCardCount = Group & {
  activeCardCount: number;
};

function getConn(database?: AnyDb) {
  return database ?? (db as AnyDb);
}

function normalizeSearchTerm(search?: string | null): string | null {
  const trimmed = search?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeGroupIds(groupIds?: string[] | null): string[] {
  return [...new Set((groupIds ?? []).map((groupId) => groupId.trim()).filter(Boolean))];
}

function mapGroupSummary(group: Pick<Group, 'groupId' | 'groupName'>): ActiveCardGroupSummary {
  return {
    groupId: group.groupId,
    groupName: group.groupName,
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function buildSearchCondition(search: string) {
  const likeQuery = `%${escapeLikePattern(search)}%`;

  return sql`(
    ${cards.content} ILIKE ${likeQuery} ESCAPE '\'
    OR COALESCE(${cards.meaning}, '') ILIKE ${likeQuery} ESCAPE '\'
    OR COALESCE(${cards.examples}::text, '') ILIKE ${likeQuery} ESCAPE '\'
    OR COALESCE(${cards.mnemonics}::text, '') ILIKE ${likeQuery} ESCAPE '\'
  )`;
}

async function findCardIdsInAnyGroup(
  userId: string,
  languageId: string,
  groupIds: string[],
  database?: AnyDb,
): Promise<string[]> {
  if (groupIds.length === 0) {
    return [];
  }

  const rows = await getConn(database)
    .select({ cardId: cardGroups.cardId })
    .from(cardGroups)
    .where(and(
      eq(cardGroups.userId, userId),
      eq(cardGroups.languageId, languageId),
      inArray(cardGroups.groupId, groupIds),
    ));

  return [...new Set(rows.map((row) => row.cardId))];
}

async function attachGroupsToCards(
  userId: string,
  languageId: string,
  rows: Array<Pick<Card, 'cardId' | 'content' | 'meaning' | 'cardType' | 'updatedAt'>>,
  database?: AnyDb,
): Promise<ActiveCardListItem[]> {
  const groupsByCardId = await getCardGroupsForCards(
    userId,
    languageId,
    rows.map((row) => row.cardId),
    database,
  );

  return rows.map((row) => ({
    ...row,
    groups: (groupsByCardId.get(row.cardId) ?? []).map((group) => mapGroupSummary(group)),
  }));
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
export async function getCardsByStatus(
  userId: string,
  languageId: string,
  status: string,
  database?: AnyDb
): Promise<Card[]> {
  return await getConn(database)
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
  threshold: number = 0.7,
  database?: AnyDb
): Promise<Array<Card & { similarity: number }>> {
  const result = await getConn(database)
    .select({
      userId: cards.userId,
      languageId: cards.languageId,
      cardId: cards.cardId,
      content: cards.content,
      status: cards.status,
      cardType: cards.cardType,
      partOfSpeech: cards.partOfSpeech,
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
 * Delete a group and dissociate any cards currently assigned to it.
 */
export async function deleteGroup(
  userId: string,
  languageId: string,
  groupId: string,
  database?: AnyDb,
): Promise<boolean> {
  const conn = getConn(database);

  await conn
    .delete(cardGroups)
    .where(and(
      eq(cardGroups.userId, userId),
      eq(cardGroups.languageId, languageId),
      eq(cardGroups.groupId, groupId),
    ));

  const result = await conn
    .delete(groups)
    .where(and(
      eq(groups.userId, userId),
      eq(groups.languageId, languageId),
      eq(groups.groupId, groupId),
    ))
    .returning({
      groupId: groups.groupId,
    });

  return result.length > 0;
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
  threshold: number = 0.6,
  database?: AnyDb
): Promise<Array<Group & { similarity: number }>> {
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

export async function listActiveCards(
  userId: string,
  languageId: string,
  filters: ActiveCardFilters = {},
  database?: AnyDb,
): Promise<ActiveCardListItem[]> {
  const conn = getConn(database);
  const search = normalizeSearchTerm(filters.search);
  const groupIds = normalizeGroupIds(filters.groupIds);
  const matchingCardIds = groupIds.length > 0
    ? await findCardIdsInAnyGroup(userId, languageId, groupIds, database)
    : null;

  if (matchingCardIds !== null && matchingCardIds.length === 0) {
    return [];
  }

  const conditions = [
    eq(cards.userId, userId),
    eq(cards.languageId, languageId),
    eq(cards.status, 'active'),
  ];

  if (search) {
    conditions.push(buildSearchCondition(search));
  }

  if (filters.cardType) {
    conditions.push(eq(cards.cardType, filters.cardType));
  }

  if (matchingCardIds !== null) {
    conditions.push(inArray(cards.cardId, matchingCardIds));
  }

  const baseQuery = conn
    .select({
      cardId: cards.cardId,
      content: cards.content,
      meaning: cards.meaning,
      cardType: cards.cardType,
      updatedAt: cards.updatedAt,
    })
    .from(cards)
    .where(and(...conditions))
    .orderBy(desc(cards.updatedAt));

  let rows: Awaited<typeof baseQuery>;

  if (typeof filters.offset === 'number' && typeof filters.limit === 'number') {
    rows = await baseQuery.offset(filters.offset).limit(filters.limit);
  } else if (typeof filters.offset === 'number') {
    rows = await baseQuery.offset(filters.offset);
  } else if (typeof filters.limit === 'number') {
    rows = await baseQuery.limit(filters.limit);
  } else {
    rows = await baseQuery;
  }

  return attachGroupsToCards(userId, languageId, rows, database);
}

export async function listActiveCardsInGroup(
  userId: string,
  languageId: string,
  groupId: string,
  filters: Omit<ActiveCardFilters, 'groupIds'> = {},
  database?: AnyDb,
): Promise<ActiveCardListItem[]> {
  return listActiveCards(
    userId,
    languageId,
    {
      ...filters,
      groupIds: [groupId],
    },
    database,
  );
}

export async function getActiveCardWithGroups(
  userId: string,
  languageId: string,
  cardId: string,
  database?: AnyDb,
): Promise<ActiveCardDetail | null> {
  const result = await getConn(database)
    .select()
    .from(cards)
    .where(and(
      eq(cards.userId, userId),
      eq(cards.languageId, languageId),
      eq(cards.cardId, cardId),
      eq(cards.status, 'active'),
    ))
    .limit(1);

  const card = result[0] ?? null;

  if (!card) {
    return null;
  }

  const groups = await getCardGroups(userId, languageId, cardId, database);

  return {
    ...card,
    groups: groups.map((group) => mapGroupSummary(group)),
  };
}

export async function updateActiveCard(
  userId: string,
  languageId: string,
  cardId: string,
  updates: Partial<Omit<NewCard, 'userId' | 'languageId' | 'cardId' | 'status'>>,
  database?: AnyDb,
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
      eq(cards.cardId, cardId),
      eq(cards.status, 'active'),
    ))
    .returning();

  return result[0] ?? null;
}

export async function softDeleteActiveCards(
  userId: string,
  languageId: string,
  cardIds: string[],
  database?: AnyDb,
): Promise<string[]> {
  const normalizedCardIds = [...new Set(cardIds.map((cardId) => cardId.trim()).filter(Boolean))];

  if (normalizedCardIds.length === 0) {
    return [];
  }

  const now = new Date();
  const deletedCards = await getConn(database)
    .update(cards)
    .set({
      status: 'deleted',
      deletedAt: now,
      updatedAt: now,
    })
    .where(and(
      eq(cards.userId, userId),
      eq(cards.languageId, languageId),
      eq(cards.status, 'active'),
      inArray(cards.cardId, normalizedCardIds),
    ))
    .returning({ cardId: cards.cardId });

  return deletedCards.map((card) => card.cardId);
}

export async function bulkAssignActiveCardsToGroup(
  userId: string,
  languageId: string,
  cardIds: string[],
  groupId: string,
  database?: AnyDb,
): Promise<string[]> {
  const normalizedCardIds = [...new Set(cardIds.map((cardId) => cardId.trim()).filter(Boolean))];

  if (normalizedCardIds.length === 0) {
    return [];
  }

  const activeCards = await getConn(database)
    .select({ cardId: cards.cardId })
    .from(cards)
    .where(and(
      eq(cards.userId, userId),
      eq(cards.languageId, languageId),
      eq(cards.status, 'active'),
      inArray(cards.cardId, normalizedCardIds),
    ));

  const activeCardIds = activeCards.map((card) => card.cardId);

  if (activeCardIds.length === 0) {
    return [];
  }

  await getConn(database)
    .insert(cardGroups)
    .values(
      activeCardIds.map((cardId) => ({
        userId,
        languageId,
        cardId,
        groupId,
        assignedAt: new Date(),
      })),
    )
    .onConflictDoNothing();

  return activeCardIds;
}

export async function listGroupsWithActiveCardCounts(
  userId: string,
  languageId: string,
  database?: AnyDb,
): Promise<GroupWithActiveCardCount[]> {
  const [allGroups, countRows] = await Promise.all([
    getGroups(userId, languageId, database),
    getConn(database)
      .select({
        groupId: cardGroups.groupId,
        activeCardCount: sql<number>`cast(count(*) as integer)`,
      })
      .from(cardGroups)
      .innerJoin(cards, and(
        eq(cards.userId, cardGroups.userId),
        eq(cards.languageId, cardGroups.languageId),
        eq(cards.cardId, cardGroups.cardId),
      ))
      .where(and(
        eq(cardGroups.userId, userId),
        eq(cardGroups.languageId, languageId),
        eq(cards.status, 'active'),
      ))
      .groupBy(cardGroups.groupId),
  ]);

  const countsByGroupId = new Map(countRows.map((row) => [row.groupId, row.activeCardCount]));

  return allGroups.map((group) => ({
    ...group,
    activeCardCount: countsByGroupId.get(group.groupId) ?? 0,
  }));
}

export async function getGroupWithActiveCardCount(
  userId: string,
  languageId: string,
  groupId: string,
  database?: AnyDb,
): Promise<GroupWithActiveCardCount | null> {
  const group = await getGroup(userId, languageId, groupId, database);

  if (!group) {
    return null;
  }

  const [countRow] = await getConn(database)
    .select({
      activeCardCount: sql<number>`cast(count(*) as integer)`,
    })
    .from(cardGroups)
    .innerJoin(cards, and(
      eq(cards.userId, cardGroups.userId),
      eq(cards.languageId, cardGroups.languageId),
      eq(cards.cardId, cardGroups.cardId),
    ))
    .where(and(
      eq(cardGroups.userId, userId),
      eq(cardGroups.languageId, languageId),
      eq(cardGroups.groupId, groupId),
      eq(cards.status, 'active'),
    ));

  return {
    ...group,
    activeCardCount: countRow?.activeCardCount ?? 0,
  };
}
