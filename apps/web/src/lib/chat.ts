import { z } from 'zod';
import {
  activeCardIdSchema,
  activeCardTypeSchema,
  activeGroupIdSchema,
  cardLibraryFiltersSchema,
  cardLibrarySearchSchema,
} from '$lib/schemas/cards.js';
import {
  cardEntryNoteContentSchema,
  editableCardOptionalTextSchema,
  editableGroupNameSchema,
} from '$lib/schemas/card-entry.js';

export const CHAT_SUGGESTION_TYPES = [
  'append_example_sentence',
  'append_mnemonic',
  'add_inbox_note',
  'create_group',
  'add_card_to_group',
  'remove_card_from_group',
  'pin_review_card',
  'snooze_review_card',
  'next_review_card',
  'draw_translation_drill_card',
  'snooze_translation_drill_card',
  'dismiss_translation_drill_card',
  'next_translation_drill_challenge',
] as const;

export const PROMPT_HISTORY_CAP = 10;

export const conversationHistoryTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2_000),
});

const selectedChatCardIdsSchema = z.array(activeCardIdSchema).max(100).default([]);
const cardReviewSelectionSchema = z.object({
  groupIds: z.array(activeGroupIdSchema).max(100).default([]),
  limit: z.number().int().min(1).max(100).nullable(),
  countMode: z.enum(['all_due', 'limit']),
});

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

export const cardDetailDrawerSurfaceContextSchema = z.object({
  surface: z.literal('card_detail_drawer'),
  cardId: activeCardIdSchema,
  sourceSurface: z.enum(['card_library_list', 'group_detail']),
  groupId: activeGroupIdSchema.optional(),
});

export const cardReviewSetupSurfaceContextSchema = z.object({
  surface: z.literal('card_review_setup'),
  selection: cardReviewSelectionSchema,
});

export const cardReviewSessionSurfaceContextSchema = z.object({
  surface: z.literal('card_review_session'),
  selection: cardReviewSelectionSchema.extend({
    groupIds: z.array(activeGroupIdSchema).min(1).max(100),
  }),
  queueCardIds: z.array(activeCardIdSchema).min(1).max(100),
  currentCardId: activeCardIdSchema,
  initialTotalCount: z.number().int().min(1).max(100),
  completedCount: z.number().int().min(0).max(100),
});

export const translationDrillsSurfaceContextSchema = z.object({
  surface: z.literal('translation_drills'),
  activeChallenge: z.object({
    challengeId: z.string().trim().min(1).max(160),
    prompt: z.string().trim().min(1).max(400),
    sourceCardIds: z.array(activeCardIdSchema).min(1).max(2),
    startedAtIso: z.string().datetime(),
  }).nullable(),
  focusedCardId: activeCardIdSchema.nullable().optional(),
});

export const chatSurfaceContextSchema = z.discriminatedUnion('surface', [
  cardLibraryListSurfaceContextSchema,
  groupsListSurfaceContextSchema,
  groupDetailSurfaceContextSchema,
  addCardsToGroupDrawerSurfaceContextSchema,
  cardDetailDrawerSurfaceContextSchema,
  cardReviewSetupSurfaceContextSchema,
  cardReviewSessionSurfaceContextSchema,
  translationDrillsSurfaceContextSchema,
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

export const appendMnemonicSuggestionSchema = z.object({
  type: z.literal('append_mnemonic'),
  payload: z.object({
    cardId: z.string().trim().min(1).max(128),
    text: z.string().trim().min(1).max(500),
  }),
});

export const createGroupSuggestionSchema = z.object({
  type: z.literal('create_group'),
  payload: z.object({
    name: editableGroupNameSchema,
    description: editableCardOptionalTextSchema,
  }),
});

export const addInboxNoteSuggestionSchema = z.object({
  type: z.literal('add_inbox_note'),
  payload: z.object({
    text: cardEntryNoteContentSchema,
  }),
});

export const addCardToGroupSuggestionSchema = z.object({
  type: z.literal('add_card_to_group'),
  payload: z.object({
    cardId: activeCardIdSchema,
    groupId: activeGroupIdSchema,
  }),
});

export const removeCardFromGroupSuggestionSchema = z.object({
  type: z.literal('remove_card_from_group'),
  payload: z.object({
    cardId: activeCardIdSchema,
    groupId: activeGroupIdSchema,
  }),
});

const cardReviewActionSuggestionPayloadSchema = z.object({
  cardId: activeCardIdSchema,
});

export const pinReviewCardSuggestionSchema = z.object({
  type: z.literal('pin_review_card'),
  payload: cardReviewActionSuggestionPayloadSchema,
});

export const snoozeReviewCardSuggestionSchema = z.object({
  type: z.literal('snooze_review_card'),
  payload: cardReviewActionSuggestionPayloadSchema,
});

export const nextReviewCardSuggestionSchema = z.object({
  type: z.literal('next_review_card'),
  payload: cardReviewActionSuggestionPayloadSchema,
});

export const drawTranslationDrillCardSuggestionSchema = z.object({
  type: z.literal('draw_translation_drill_card'),
  payload: z.object({
    groupId: activeGroupIdSchema,
  }),
});

export const snoozeTranslationDrillCardSuggestionSchema = z.object({
  type: z.literal('snooze_translation_drill_card'),
  payload: z.object({
    cardId: activeCardIdSchema,
  }),
});

export const dismissTranslationDrillCardSuggestionSchema = z.object({
  type: z.literal('dismiss_translation_drill_card'),
  payload: z.object({
    cardId: activeCardIdSchema,
  }),
});

export const nextTranslationDrillChallengeSuggestionSchema = z.object({
  type: z.literal('next_translation_drill_challenge'),
  payload: z.object({}),
});

export const chatSuggestionSchema = z.discriminatedUnion('type', [
  appendExampleSentenceSuggestionSchema,
  appendMnemonicSuggestionSchema,
  addInboxNoteSuggestionSchema,
  createGroupSuggestionSchema,
  addCardToGroupSuggestionSchema,
  removeCardFromGroupSuggestionSchema,
  pinReviewCardSuggestionSchema,
  snoozeReviewCardSuggestionSchema,
  nextReviewCardSuggestionSchema,
  drawTranslationDrillCardSuggestionSchema,
  snoozeTranslationDrillCardSuggestionSchema,
  dismissTranslationDrillCardSuggestionSchema,
  nextTranslationDrillChallengeSuggestionSchema,
]);

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
