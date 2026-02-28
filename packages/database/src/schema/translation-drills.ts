import { pgTable, text, integer, real, boolean, timestamp, jsonb, index, primaryKey } from 'drizzle-orm/pg-core';

export const translationDrillSrs = pgTable('translation_drill_srs', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  cardId: text('card_id').notNull(),
  nextDue: integer('next_due').notNull().default(0),
  intervalDays: integer('interval_days').default(1),
  usageCount: integer('usage_count').default(0),
  lastUsed: integer('last_used'),
  performanceScore: real('performance_score'),
  metadata: jsonb('metadata'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.languageId, table.cardId] }),
  dueIdx: index('idx_translation_drill_srs_due').on(table.userId, table.languageId, table.nextDue),
}));

export const translationDrillDrawPiles = pgTable('translation_drill_draw_piles', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  groupId: text('group_id').notNull(),
  enabled: boolean('enabled').default(true),
  drawPileName: text('draw_pile_name'),
  pileSizeLimit: integer('pile_size_limit').default(10),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.languageId, table.groupId] }),
  enabledIdx: index('idx_draw_piles_enabled').on(table.userId, table.languageId, table.enabled),
}));

export const translationDrillContext = pgTable('translation_drill_context', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  cardId: text('card_id').notNull(),
  state: text('state').notNull().default('active'),
  addedFrom: text('added_from'),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow(),
  lastUsed: timestamp('last_used', { withTimezone: true }),
  usageCount: integer('usage_count').default(0),
  stateUntil: timestamp('state_until', { withTimezone: true }),
  cefrOverride: text('cefr_override'),
  metadata: jsonb('metadata'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.languageId, table.cardId] }),
  stateIdx: index('idx_translation_context_state').on(table.userId, table.languageId, table.state),
  addedIdx: index('idx_translation_context_added').on(table.userId, table.languageId, table.addedAt),
  rotationIdx: index('idx_translation_context_rotation').on(table.userId, table.languageId, table.state, table.lastUsed),
}));

export const translationDrillDailyStats = pgTable('translation_drill_daily_stats', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  date: text('date').notNull(),
  sentencesTranslated: integer('sentences_translated').default(0),
  totalSessionTimeMinutes: integer('total_session_time_minutes').default(0),
  cardsDismissed: integer('cards_dismissed').default(0),
  cardsSnoozed: integer('cards_snoozed').default(0),
  cardsDrawn: integer('cards_drawn').default(0),
  newContextGroupsAdded: integer('new_context_groups_added').default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.languageId, table.date] }),
  dateIdx: index('idx_translation_drill_stats_date').on(table.userId, table.languageId, table.date),
}));

export type TranslationDrillSrs = typeof translationDrillSrs.$inferSelect;
export type NewTranslationDrillSrs = typeof translationDrillSrs.$inferInsert;
export type TranslationDrillDrawPile = typeof translationDrillDrawPiles.$inferSelect;
export type NewTranslationDrillDrawPile = typeof translationDrillDrawPiles.$inferInsert;
export type TranslationDrillContext = typeof translationDrillContext.$inferSelect;
export type NewTranslationDrillContext = typeof translationDrillContext.$inferInsert;
export type TranslationDrillDailyStats = typeof translationDrillDailyStats.$inferSelect;
export type NewTranslationDrillDailyStats = typeof translationDrillDailyStats.$inferInsert;
