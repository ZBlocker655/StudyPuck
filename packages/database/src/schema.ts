import { pgTable, text, timestamp, vector, index, jsonb, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Users table - matches database-schema-draft.sql
 * Auth0 user profiles with metadata
 */
export const users = pgTable('users', {
  userId: text('user_id').primaryKey(),
  email: text('email').unique().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  metadata: jsonb('metadata'), // JSON: preferences, settings, etc.
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
}));

/**
 * Study Languages table - user language preferences
 * Each user can study multiple languages
 */
export const studyLanguages = pgTable('study_languages', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(), // ISO language code (en, zh, fr, etc.)
  languageName: text('language_name').notNull(), // Display name
  isActive: boolean('is_active').default(true),
  cefrLevel: text('cefr_level').default('A1'), // CHECK constraint handled in migration
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  settings: jsonb('settings'), // JSON: language-specific settings
}, (table) => ({
  primaryKey: [table.userId, table.languageId],
}));

/**
 * Groups table - study card groups with vector embeddings
 * Each group belongs to a user+language combination
 */
export const groups = pgTable('groups', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  groupId: text('group_id').notNull(), // user-defined ID
  groupName: text('group_name').notNull(),
  description: text('description'),
  embedding: vector('embedding', { dimensions: 768 }), // Vector embedding for group similarity
  embeddingModel: text('embedding_model'), // Track which model generated the embedding
  embeddingGeneratedAt: timestamp('embedding_generated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  metadata: jsonb('metadata'), // JSON: group settings, color, etc.
}, (table) => ({
  primaryKey: [table.userId, table.languageId, table.groupId],
  embeddingSimilarityIdx: index('idx_groups_embedding_similarity').using('hnsw', table.embedding.op('vector_cosine_ops')),
}));

/**
 * Cards table - main study content with vector embeddings
 * Core shared entity across all applications
 */
export const cards = pgTable('cards', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  cardId: text('card_id').notNull(), // UUID or user-friendly ID
  content: text('content').notNull(), // Main study prompt
  status: text('status').default('active'), // CHECK constraint: 'draft', 'active', 'archived', 'deleted'
  cardType: text('card_type').default('word'), // CHECK constraint: 'word', 'pattern', 'complex_prompt'
  meaning: text('meaning'),
  examples: jsonb('examples'), // JSON array of example objects
  mnemonics: jsonb('mnemonics'), // JSON array of mnemonic strings
  llmInstructions: text('llm_instructions'), // Instructions for AI features
  embedding: vector('embedding', { dimensions: 768 }), // Vector embedding for similarity search
  embeddingModel: text('embedding_model'), // Track which model generated the embedding
  embeddingGeneratedAt: timestamp('embedding_generated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  metadata: jsonb('metadata'), // JSON: additional flexible data
}, (table) => ({
  primaryKey: [table.userId, table.languageId, table.cardId],
  statusTypeIdx: index('idx_cards_status_type').on(table.userId, table.languageId, table.status, table.cardType),
  statusUpdatedIdx: index('idx_cards_status_updated').on(table.userId, table.languageId, table.status, table.updatedAt),
  embeddingSimilarityIdx: index('idx_cards_embedding_similarity').using('hnsw', table.embedding.op('vector_cosine_ops')),
  activeTypeIdx: index('idx_cards_active_type').on(table.userId, table.languageId, table.cardType),
  activeUpdatedIdx: index('idx_cards_active_updated').on(table.userId, table.languageId, table.updatedAt),
}));

/**
 * Card Groups table - Many-to-many relationship between cards and groups
 */
export const cardGroups = pgTable('card_groups', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  cardId: text('card_id').notNull(),
  groupId: text('group_id').notNull(),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  primaryKey: [table.userId, table.languageId, table.cardId, table.groupId],
  byGroupIdx: index('idx_card_groups_by_group').on(table.userId, table.languageId, table.groupId),
  byCardIdx: index('idx_card_groups_by_card').on(table.userId, table.languageId, table.cardId),
}));

// Type exports for use in application code
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type StudyLanguage = typeof studyLanguages.$inferSelect;
export type NewStudyLanguage = typeof studyLanguages.$inferInsert;
export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type CardGroup = typeof cardGroups.$inferSelect;
export type NewCardGroup = typeof cardGroups.$inferInsert;