import { pgTable, text, timestamp, jsonb, integer, index, primaryKey } from 'drizzle-orm/pg-core';

export const inboxNotes = pgTable('inbox_notes', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  noteId: text('note_id').notNull(),
  content: text('content').notNull(),
  state: text('state').default('unprocessed'),
  sourceType: text('source_type').default('manual'),
  sourceMetadata: jsonb('source_metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.languageId, table.noteId] }),
  stateIdx: index('idx_inbox_state').on(table.userId, table.languageId, table.state, table.createdAt),
  sourceIdx: index('idx_inbox_source').on(table.userId, table.languageId, table.sourceType),
}));

export const noteCardLinks = pgTable('note_card_links', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  noteId: text('note_id').notNull(),
  cardId: text('card_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.languageId, table.noteId, table.cardId] }),
  byNoteIdx: index('idx_note_card_links_note').on(table.userId, table.languageId, table.noteId),
  byCardIdx: index('idx_note_card_links_card').on(table.userId, table.languageId, table.cardId),
}));

export const cardEntryDailyStats = pgTable('card_entry_daily_stats', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  date: text('date').notNull(),
  notesCaptured: integer('notes_captured').default(0),
  notesProcessed: integer('notes_processed').default(0),
  notesDeferred: integer('notes_deferred').default(0),
  notesDeleted: integer('notes_deleted').default(0),
  draftCardsCreated: integer('draft_cards_created').default(0),
  cardsPromotedToActive: integer('cards_promoted_to_active').default(0),
  groupsCreated: integer('groups_created').default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.languageId, table.date] }),
  dateIdx: index('idx_card_entry_stats_date').on(table.userId, table.languageId, table.date),
}));

export type InboxNote = typeof inboxNotes.$inferSelect;
export type NewInboxNote = typeof inboxNotes.$inferInsert;
export type NoteCardLink = typeof noteCardLinks.$inferSelect;
export type NewNoteCardLink = typeof noteCardLinks.$inferInsert;
export type CardEntryDailyStats = typeof cardEntryDailyStats.$inferSelect;
export type NewCardEntryDailyStats = typeof cardEntryDailyStats.$inferInsert;
