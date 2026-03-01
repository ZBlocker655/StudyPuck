import { pgTable, text, timestamp, jsonb, boolean, primaryKey, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  userId: text('user_id').primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name'),
  pictureUrl: text('picture_url'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  metadata: jsonb('metadata'),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
}));

export const studyLanguages = pgTable('study_languages', {
  userId: text('user_id').notNull(),
  languageId: text('language_id').notNull(),
  languageName: text('language_name').notNull(),
  isActive: boolean('is_active').default(true),
  cefrLevel: text('cefr_level').default('A1'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  settings: jsonb('settings'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.languageId] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type StudyLanguage = typeof studyLanguages.$inferSelect;
export type NewStudyLanguage = typeof studyLanguages.$inferInsert;
