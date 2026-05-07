import { z } from 'zod';
import {
  activeCardIdSchema,
  activeCardTypeSchema,
  activeGroupIdSchema,
  cardLibraryFiltersSchema,
  cardLibrarySearchSchema,
} from '$lib/schemas/cards.js';

export const CHAT_SUGGESTION_TYPES = ['append_example_sentence'] as const;

export const PROMPT_HISTORY_CAP = 10;

export const conversationHistoryTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2_000),
});

const selectedChatCardIdsSchema = z.array(activeCardIdSchema).max(100).default([]);

export const cardLibraryListSurfaceContextSchema = z.object({
  surface: z.literal('card_library_list'),
  filters: cardLibraryFiltersSchema,
  selectedCardIds: selectedChatCardIdsSchema,
});

export const groupsListSurfaceContextSchema = z.object({
  surface: z.literal('groups_list'),
});

export const groupDetailSurfaceContextSchema = z.object({
  surface: z.literal('group_detail'),
  groupId: activeGroupIdSchema,
  filters: z.object({
    searchText: cardLibrarySearchSchema.default(''),
    cardType: activeCardTypeSchema.nullable(),
  }),
  selectedCardIds: selectedChatCardIdsSchema,
});

export const addCardsToGroupDrawerSurfaceContextSchema = z.object({
  surface: z.literal('add_cards_to_group_drawer'),
  groupId: activeGroupIdSchema,
  searchText: cardLibrarySearchSchema.default(''),
  selectedCardIds: selectedChatCardIdsSchema,
});

export const chatSurfaceContextSchema = z.discriminatedUnion('surface', [
  cardLibraryListSurfaceContextSchema,
  groupsListSurfaceContextSchema,
  groupDetailSurfaceContextSchema,
  addCardsToGroupDrawerSurfaceContextSchema,
]);

export type ConversationHistoryTurn = z.infer<typeof conversationHistoryTurnSchema>;
export type ChatSurfaceContext = z.infer<typeof chatSurfaceContextSchema>;

export const chatRequestSchema = z.object({
  input: z.string().trim().min(1, 'A chat message is required.').max(2_000),
  pathname: z.string().trim().min(1, 'A route pathname is required.').max(500),
  languageId: z.string().trim().min(1).max(64).optional(),
  noteId: z.string().trim().min(1).max(128).optional(),
  cardId: z.string().trim().min(1).max(128).optional(),
  focusedField: z.string().trim().min(1).max(64).optional(),
  surfaceContext: chatSurfaceContextSchema.optional(),
  conversationHistory: z.array(conversationHistoryTurnSchema).max(PROMPT_HISTORY_CAP).optional(),
});

export const appendExampleSentenceSuggestionSchema = z.object({
  type: z.literal('append_example_sentence'),
  payload: z.object({
    cardId: z.string().trim().min(1).max(128),
    text: z.string().trim().min(1).max(500),
  }),
});

export const chatSuggestionSchema = z.discriminatedUnion('type', [appendExampleSentenceSuggestionSchema]);

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatSuggestion = z.infer<typeof chatSuggestionSchema>;
export type ChatSuggestionType = (typeof CHAT_SUGGESTION_TYPES)[number];

export function createChatSuggestionsSchema(allowedSuggestionTypes: readonly ChatSuggestionType[]) {
  if (allowedSuggestionTypes.length === 0) {
    return z.array(z.never()).max(0).optional().default([]);
  }

  return z
    .array(chatSuggestionSchema)
    .max(3)
    .refine(
      (suggestions) => suggestions.every((suggestion) => allowedSuggestionTypes.includes(suggestion.type)),
      'One or more suggestions are not allowed in this context.',
    )
    .optional()
    .default([]);
}

export function createChatResponseSchema(allowedSuggestionTypes: readonly ChatSuggestionType[]) {
  return z.object({
    message: z.string().trim().min(1).max(2_000),
    suggestions: createChatSuggestionsSchema(allowedSuggestionTypes),
  });
}

export const chatResponseSchema = createChatResponseSchema(CHAT_SUGGESTION_TYPES);

export type ChatResponse = z.infer<typeof chatResponseSchema>;
