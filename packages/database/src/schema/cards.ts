import { pgTable, text, timestamp, jsonb, vector, index, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const groups = pgTable('groups', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  groupId: text('group_id').notNull(),
  groupName: text('group_name').notNull(),
  description: text('description'),
  embedding: vector('embedding', { dimensions: 768 }),
  embeddingModel: text('embedding_model'),
  embeddingGeneratedAt: timestamp('embedding_generated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  metadata: jsonb('metadata'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.languageId, table.groupId] }),
  embeddingSimilarityIdx: index('idx_groups_embedding_similarity').using('hnsw', table.embedding.op('vector_cosine_ops')),
}));

export const cards = pgTable('cards', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  cardId: text('card_id').notNull(),
  content: text('content').notNull(),
  status: text('status').default('active'),
  cardType: text('card_type').default('word'),
  meaning: text('meaning'),
  examples: jsonb('examples'),
  mnemonics: jsonb('mnemonics'),
  llmInstructions: text('llm_instructions'),
  embedding: vector('embedding', { dimensions: 768 }),
  embeddingModel: text('embedding_model'),
  embeddingGeneratedAt: timestamp('embedding_generated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  metadata: jsonb('metadata'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.languageId, table.cardId] }),
  statusTypeIdx: index('idx_cards_status_type').on(table.userId, table.languageId, table.status, table.cardType),
  statusUpdatedIdx: index('idx_cards_status_updated').on(table.userId, table.languageId, table.status, table.updatedAt),
  embeddingSimilarityIdx: index('idx_cards_embedding_similarity').using('hnsw', table.embedding.op('vector_cosine_ops')),
  activeTypeIdx: index('idx_cards_active_type').on(table.userId, table.languageId, table.cardType),
  activeUpdatedIdx: index('idx_cards_active_updated').on(table.userId, table.languageId, table.updatedAt),
  fulltextEnglishIdx: index('idx_cards_fulltext').using(
    'gin',
    sql`to_tsvector('english', ${table.content} || ' ' || COALESCE(${table.meaning}, '') || ' ' || COALESCE(${table.examples}::text, ''))`
  ),
  fulltextSimpleIdx: index('idx_cards_fulltext_simple').using(
    'gin',
    sql`to_tsvector('simple', ${table.content} || ' ' || COALESCE(${table.meaning}, '') || ' ' || COALESCE(${table.examples}::text, ''))`
  ),
}));

export const cardGroups = pgTable('card_groups', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  cardId: text('card_id').notNull(),
  groupId: text('group_id').notNull(),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.languageId, table.cardId, table.groupId] }),
  byGroupIdx: index('idx_card_groups_by_group').on(table.userId, table.languageId, table.groupId),
  byCardIdx: index('idx_card_groups_by_card').on(table.userId, table.languageId, table.cardId),
}));

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type CardGroup = typeof cardGroups.$inferSelect;
export type NewCardGroup = typeof cardGroups.$inferInsert;
