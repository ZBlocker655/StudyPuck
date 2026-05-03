import { z } from 'zod';

export const activeCardIdSchema = z.string().trim().min(1, 'A card identifier is required.');
export const activeGroupIdSchema = z.string().trim().min(1, 'A group identifier is required.');
export const activeCardTypeSchema = z.enum(['word', 'pattern', 'complex_prompt']);

export const cardLibrarySearchSchema = z.string().trim().max(200, 'Search text must be 200 characters or fewer.');

export const cardLibraryFiltersSchema = z.object({
  searchText: cardLibrarySearchSchema.default(''),
  groupIds: z.array(activeGroupIdSchema).max(20, 'No more than 20 groups can be filtered at once.'),
  cardType: activeCardTypeSchema.nullable(),
});
