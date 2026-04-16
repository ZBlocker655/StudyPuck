import { z } from 'zod';

export const inboxSortOrderSchema = z.enum(['oldest-first', 'newest-first']);

export const cardEntryNoteIdSchema = z.string().trim().min(1, 'A note identifier is required.');

export const cardEntryNoteContentSchema = z
  .string()
  .trim()
  .min(1, 'Note content cannot be empty.')
  .max(4_000, 'Note content must be 4,000 characters or fewer.');

export const createCardEntryNoteSchema = z.object({
  languageId: z.string().trim().min(1, 'A language is required.'),
  content: cardEntryNoteContentSchema,
});
