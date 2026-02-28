import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
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

// === Custom enum validators ===
export const cardStatusSchema = z.enum(['draft', 'active', 'archived', 'deleted']);
export const cardTypeSchema = z.enum(['word', 'pattern', 'complex_prompt']);
export const cefrLevelSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export const inboxNoteStateSchema = z.enum(['unprocessed', 'deferred', 'deleted']);
export const inboxSourceTypeSchema = z.enum(['manual', 'api', 'browser_extension', 'ifttt', 'zapier', 'n8n']);
export const drillContextStateSchema = z.enum(['active', 'snoozed', 'dismissed']);

// === Users ===
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

// === Study Languages ===
export const insertStudyLanguageSchema = createInsertSchema(studyLanguages).extend({
  cefrLevel: cefrLevelSchema.optional(),
});
export const selectStudyLanguageSchema = createSelectSchema(studyLanguages);

// === Groups ===
export const insertGroupSchema = createInsertSchema(groups);
export const selectGroupSchema = createSelectSchema(groups);

// === Cards ===
export const insertCardSchema = createInsertSchema(cards).extend({
  status: cardStatusSchema.optional(),
  cardType: cardTypeSchema.optional(),
});
export const selectCardSchema = createSelectSchema(cards);

// === Card Groups ===
export const insertCardGroupSchema = createInsertSchema(cardGroups);
export const selectCardGroupSchema = createSelectSchema(cardGroups);

// === Card Entry ===
export const insertInboxNoteSchema = createInsertSchema(inboxNotes).extend({
  state: inboxNoteStateSchema.optional(),
  sourceType: inboxSourceTypeSchema.optional(),
});
export const selectInboxNoteSchema = createSelectSchema(inboxNotes);

export const insertNoteCardLinkSchema = createInsertSchema(noteCardLinks);
export const selectNoteCardLinkSchema = createSelectSchema(noteCardLinks);

export const insertCardEntryDailyStatsSchema = createInsertSchema(cardEntryDailyStats);
export const selectCardEntryDailyStatsSchema = createSelectSchema(cardEntryDailyStats);

// === Card Review ===
export const insertCardReviewSrsSchema = createInsertSchema(cardReviewSrs);
export const selectCardReviewSrsSchema = createSelectSchema(cardReviewSrs);

export const insertCardReviewDailyStatsSchema = createInsertSchema(cardReviewDailyStats);
export const selectCardReviewDailyStatsSchema = createSelectSchema(cardReviewDailyStats);

// === Translation Drills ===
export const insertTranslationDrillSrsSchema = createInsertSchema(translationDrillSrs);
export const selectTranslationDrillSrsSchema = createSelectSchema(translationDrillSrs);

export const insertTranslationDrillDrawPileSchema = createInsertSchema(translationDrillDrawPiles);
export const selectTranslationDrillDrawPileSchema = createSelectSchema(translationDrillDrawPiles);

export const insertTranslationDrillContextSchema = createInsertSchema(translationDrillContext).extend({
  state: drillContextStateSchema.optional(),
  cefrOverride: cefrLevelSchema.optional().nullable(),
});
export const selectTranslationDrillContextSchema = createSelectSchema(translationDrillContext);

export const insertTranslationDrillDailyStatsSchema = createInsertSchema(translationDrillDailyStats);
export const selectTranslationDrillDailyStatsSchema = createSelectSchema(translationDrillDailyStats);
