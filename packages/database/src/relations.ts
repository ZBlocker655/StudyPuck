import { relations } from 'drizzle-orm';
import { users, studyLanguages } from './schema/users.js';
import { groups, cards, cardGroups } from './schema/cards.js';
import { inboxNotes, noteCardLinks, cardEntryDailyStats } from './schema/card-entry.js';
import { cardReviewSrs, cardReviewDailyStats } from './schema/card-review.js';
import {
  translationDrillSrs,
  translationDrillDrawPiles,
  translationDrillContext,
  translationDrillDailyStats,
} from './schema/translation-drills.js';

export const usersRelations = relations(users, ({ many }) => ({
  studyLanguages: many(studyLanguages),
}));

export const studyLanguagesRelations = relations(studyLanguages, ({ one, many }) => ({
  user: one(users, { fields: [studyLanguages.userId], references: [users.userId] }),
  cards: many(cards),
  groups: many(groups),
  inboxNotes: many(inboxNotes),
  cardEntryDailyStats: many(cardEntryDailyStats),
  cardReviewDailyStats: many(cardReviewDailyStats),
  translationDrillDailyStats: many(translationDrillDailyStats),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  studyLanguage: one(studyLanguages, {
    fields: [groups.userId, groups.languageId],
    references: [studyLanguages.userId, studyLanguages.languageId],
  }),
  cardGroups: many(cardGroups),
  translationDrillDrawPiles: many(translationDrillDrawPiles),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  studyLanguage: one(studyLanguages, {
    fields: [cards.userId, cards.languageId],
    references: [studyLanguages.userId, studyLanguages.languageId],
  }),
  cardGroups: many(cardGroups),
  noteCardLinks: many(noteCardLinks),
  cardReviewSrs: one(cardReviewSrs),
  translationDrillSrs: one(translationDrillSrs),
  translationDrillContext: one(translationDrillContext),
}));

export const cardGroupsRelations = relations(cardGroups, ({ one }) => ({
  card: one(cards, {
    fields: [cardGroups.userId, cardGroups.languageId, cardGroups.cardId],
    references: [cards.userId, cards.languageId, cards.cardId],
  }),
  group: one(groups, {
    fields: [cardGroups.userId, cardGroups.languageId, cardGroups.groupId],
    references: [groups.userId, groups.languageId, groups.groupId],
  }),
}));

export const inboxNotesRelations = relations(inboxNotes, ({ one, many }) => ({
  studyLanguage: one(studyLanguages, {
    fields: [inboxNotes.userId, inboxNotes.languageId],
    references: [studyLanguages.userId, studyLanguages.languageId],
  }),
  noteCardLinks: many(noteCardLinks),
}));

export const noteCardLinksRelations = relations(noteCardLinks, ({ one }) => ({
  note: one(inboxNotes, {
    fields: [noteCardLinks.userId, noteCardLinks.languageId, noteCardLinks.noteId],
    references: [inboxNotes.userId, inboxNotes.languageId, inboxNotes.noteId],
  }),
  card: one(cards, {
    fields: [noteCardLinks.userId, noteCardLinks.languageId, noteCardLinks.cardId],
    references: [cards.userId, cards.languageId, cards.cardId],
  }),
}));

export const cardReviewSrsRelations = relations(cardReviewSrs, ({ one }) => ({
  card: one(cards, {
    fields: [cardReviewSrs.userId, cardReviewSrs.languageId, cardReviewSrs.cardId],
    references: [cards.userId, cards.languageId, cards.cardId],
  }),
}));

export const translationDrillSrsRelations = relations(translationDrillSrs, ({ one }) => ({
  card: one(cards, {
    fields: [translationDrillSrs.userId, translationDrillSrs.languageId, translationDrillSrs.cardId],
    references: [cards.userId, cards.languageId, cards.cardId],
  }),
}));

export const translationDrillDrawPilesRelations = relations(translationDrillDrawPiles, ({ one }) => ({
  group: one(groups, {
    fields: [translationDrillDrawPiles.userId, translationDrillDrawPiles.languageId, translationDrillDrawPiles.groupId],
    references: [groups.userId, groups.languageId, groups.groupId],
  }),
}));

export const translationDrillContextRelations = relations(translationDrillContext, ({ one }) => ({
  card: one(cards, {
    fields: [translationDrillContext.userId, translationDrillContext.languageId, translationDrillContext.cardId],
    references: [cards.userId, cards.languageId, cards.cardId],
  }),
}));
