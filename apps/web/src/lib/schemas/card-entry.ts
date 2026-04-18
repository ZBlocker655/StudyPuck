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

const editableCardTextSchema = z.string().trim().max(4_000, 'Card text must be 4,000 characters or fewer.');
const editableCardListItemSchema = z.string().trim().max(1_000, 'List items must be 1,000 characters or fewer.');
export const editableGroupNameSchema = z
  .string()
  .trim()
  .min(1, 'Group names cannot be empty.')
  .max(80, 'Group names must be 80 characters or fewer.');

export const editableCardOptionalTextSchema = editableCardTextSchema.transform((value) => value || null);

export const editableCardListSchema = z
  .array(editableCardListItemSchema)
  .max(20, 'No more than 20 items are allowed.')
  .transform((items) => items.filter(Boolean));

export const editableCardGroupSelectionSchema = z.object({
  groupId: z.string().trim().min(1).nullable().optional(),
  groupName: editableGroupNameSchema,
});

export const cardEntryDraftCardUpdateSchema = z.object({
  content: editableCardTextSchema,
  meaning: editableCardOptionalTextSchema,
  examples: editableCardListSchema,
  mnemonics: editableCardListSchema,
  llmInstructions: editableCardOptionalTextSchema,
  groups: z.array(editableCardGroupSelectionSchema).max(20, 'No more than 20 groups are allowed.'),
});
