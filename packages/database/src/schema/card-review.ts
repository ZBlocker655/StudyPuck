import { pgTable, text, integer, real, jsonb, index, primaryKey } from 'drizzle-orm/pg-core';

export const cardReviewSrs = pgTable('card_review_srs', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  cardId: text('card_id').notNull(),
  nextDue: integer('next_due').notNull().default(0),
  intervalDays: integer('interval_days').default(1),
  easeFactor: real('ease_factor').default(2.5),
  reviewCount: integer('review_count').default(0),
  lastReviewed: integer('last_reviewed'),
  metadata: jsonb('metadata'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.languageId, table.cardId] }),
  dueIdx: index('idx_card_review_srs_due').on(table.userId, table.languageId, table.nextDue),
  intervalIdx: index('idx_card_review_srs_interval').on(table.userId, table.languageId, table.intervalDays),
}));

export const cardReviewDailyStats = pgTable('card_review_daily_stats', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  date: text('date').notNull(),
  cardsReviewed: integer('cards_reviewed').default(0),
  totalReviewTimeMinutes: integer('total_review_time_minutes').default(0),
  cardsRatedEasy: integer('cards_rated_easy').default(0),
  cardsRatedMedium: integer('cards_rated_medium').default(0),
  cardsRatedHard: integer('cards_rated_hard').default(0),
  cardsSnoozed: integer('cards_snoozed').default(0),
  cardsDisabled: integer('cards_disabled').default(0),
  cardsPinnedToDrills: integer('cards_pinned_to_drills').default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.languageId, table.date] }),
  dateIdx: index('idx_card_review_stats_date').on(table.userId, table.languageId, table.date),
}));

export type CardReviewSrs = typeof cardReviewSrs.$inferSelect;
export type NewCardReviewSrs = typeof cardReviewSrs.$inferInsert;
export type CardReviewDailyStats = typeof cardReviewDailyStats.$inferSelect;
export type NewCardReviewDailyStats = typeof cardReviewDailyStats.$inferInsert;
