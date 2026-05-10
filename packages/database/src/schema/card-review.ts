import { pgTable, text, integer, real, timestamp, jsonb, index, primaryKey } from 'drizzle-orm/pg-core';

export const cardReviewSrs = pgTable('card_review_srs', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  cardId: text('card_id').notNull(),
  nextDue: integer('next_due').notNull().default(0),
  intervalDays: integer('interval_days').default(1),
  easeFactor: real('ease_factor').default(2.5),
  reviewCount: integer('review_count').default(0),
  lastReviewed: integer('last_reviewed'),
  state: text('state').notNull().default('active'),
  snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
  metadata: jsonb('metadata'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.languageId, table.cardId] }),
  dueIdx: index('idx_card_review_srs_due').on(table.userId, table.languageId, table.nextDue),
  intervalIdx: index('idx_card_review_srs_interval').on(table.userId, table.languageId, table.intervalDays),
  stateIdx: index('idx_card_review_srs_state').on(table.userId, table.languageId, table.state),
}));

export const cardReviewEvents = pgTable('card_review_events', {
  eventId: text('event_id').primaryKey(),
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  cardId: text('card_id').notNull(),
  eventType: text('event_type').notNull(),
  rating: text('rating'),
  previousState: text('previous_state'),
  nextState: text('next_state'),
  previousIntervalDays: integer('previous_interval_days'),
  nextIntervalDays: integer('next_interval_days'),
  previousDue: integer('previous_due'),
  nextDue: integer('next_due'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb('metadata'),
}, (table) => ({
  cardTimelineIdx: index('idx_card_review_events_card_timeline').on(
    table.userId,
    table.languageId,
    table.cardId,
    table.occurredAt,
  ),
  eventTypeIdx: index('idx_card_review_events_type').on(table.userId, table.languageId, table.eventType),
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
export type CardReviewEvent = typeof cardReviewEvents.$inferSelect;
export type NewCardReviewEvent = typeof cardReviewEvents.$inferInsert;
export type CardReviewDailyStats = typeof cardReviewDailyStats.$inferSelect;
export type NewCardReviewDailyStats = typeof cardReviewDailyStats.$inferInsert;
