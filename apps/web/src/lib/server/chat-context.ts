import { getActiveUserLanguages, getNoteWithDraftCards } from '@studypuck/database';
import {
  buildCardEntryExampleSentenceFormatInstruction,
  DEFAULT_CARD_ENTRY_EXAMPLE_SENTENCE_FORMAT,
  readCardEntryExampleSentenceFormat,
  type CardEntryExampleSentenceFormat,
} from '$lib/card-entry/example-sentence-format.js';
import type { ChatSuggestionType } from '$lib/chat.js';
import type { RouteContext } from '$lib/command-bar/shared.js';
import { CardEntryRequestError } from '$lib/server/card-entry.js';

type DatabaseClient = NonNullable<Parameters<typeof getNoteWithDraftCards>[3]>;

// ── Canonical context types ──────────────────────────────────────────────────

export type DraftCardSnapshot = {
  content: string;
  meaning: string | null;
  examples: string[];
  mnemonics: string[];
  llmInstructions: string | null;
};

export type DraftCardEditorContext = {
  contextType: 'draft_card_editor';
  languageId: string;
  noteId: string;
  noteContent: string;
  cardId: string;
  focusedField: string | null;
  allowedSuggestionTypes: readonly ['append_example_sentence'];
  exampleSentenceFormat: CardEntryExampleSentenceFormat;
  exampleSentenceFormatInstruction: string;
  cardSnapshot: DraftCardSnapshot;
};

export type NonActionableContext = {
  contextType: 'non_actionable';
  routeContextType: RouteContext['routeContextType'];
  languageId: string | null;
  allowedSuggestionTypes: readonly [];
};

export type CanonicalChatContext = DraftCardEditorContext | NonActionableContext;

// ── Context hint (derived from the client request) ───────────────────────────

export type ChatContextHint = {
  routeContext: RouteContext;
  languageId?: string;
  noteId?: string;
  cardId?: string;
  focusedField?: string;
};

// jsonb columns in the database schema are typed as `unknown` by Drizzle because
// they can contain any JSON value. This helper safely extracts a string array from
// a jsonb field, filtering out non-string elements to guarantee the return type.
function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

async function resolveDraftCardEditorContext(
  userId: string,
  hint: Required<Pick<ChatContextHint, 'languageId' | 'noteId' | 'cardId'>> & Pick<ChatContextHint, 'focusedField'>,
  database: DatabaseClient,
): Promise<DraftCardEditorContext> {
  // Load the workspace – this verifies the user owns the note and that it
  // belongs to the requested language.
  const workspace = await getNoteWithDraftCards(userId, hint.languageId, hint.noteId, database);

  if (!workspace) {
    throw new CardEntryRequestError(404, 'Card Entry note not found.');
  }

  const draftCard = workspace.draftCards.find((card) => card.cardId === hint.cardId) ?? null;

  if (!draftCard) {
    throw new CardEntryRequestError(404, 'Draft card not found for this note.');
  }

  // Load the language settings to get the configured example sentence format.
  const languages = await getActiveUserLanguages(userId, database);
  const language = languages.find((lang) => lang.languageId === hint.languageId) ?? null;
  const exampleSentenceFormat = readCardEntryExampleSentenceFormat(language?.settings);

  return {
    contextType: 'draft_card_editor',
    languageId: hint.languageId,
    noteId: hint.noteId,
    noteContent: workspace.note.content,
    cardId: hint.cardId,
    focusedField: hint.focusedField ?? null,
    allowedSuggestionTypes: ['append_example_sentence'],
    exampleSentenceFormat,
    exampleSentenceFormatInstruction: buildCardEntryExampleSentenceFormatInstruction({
      exampleSentenceFormat,
      languageId: hint.languageId,
    }),
    cardSnapshot: {
      content: draftCard.content,
      meaning: draftCard.meaning,
      examples: toStringArray(draftCard.examples),
      mnemonics: toStringArray(draftCard.mnemonics),
      llmInstructions: draftCard.llmInstructions,
    },
  };
}

// ── Resolver: non-actionable (cards, stats, settings, workspace) ─────────────

function resolveNonActionableContext(
  hint: Pick<ChatContextHint, 'routeContext' | 'languageId'>,
): NonActionableContext {
  return {
    contextType: 'non_actionable',
    routeContextType: hint.routeContext.routeContextType,
    languageId: hint.languageId ?? null,
    allowedSuggestionTypes: [],
  };
}

// ── Main entry point ─────────────────────────────────────────────────────────

/**
 * Derives the canonical prompt context for a chat request.
 *
 * When the request comes from the draft-card editor (card-entry context with a
 * valid noteId + cardId), the backend loads the note and card from the database,
 * verifies ownership, and constructs a context that includes the card snapshot
 * and the settings-driven example-sentence-format instruction.
 *
 * For all other contexts the backend constructs a lightweight non-actionable
 * context with no DB lookups.
 */
export async function resolveCanonicalChatContext(
  userId: string,
  hint: ChatContextHint,
  database: DatabaseClient | null,
): Promise<CanonicalChatContext> {
  const isDraftCardEditor =
    hint.routeContext.routeContextType === 'card-entry' &&
    hint.languageId &&
    hint.noteId &&
    hint.cardId &&
    database !== null;

  if (isDraftCardEditor) {
    return resolveDraftCardEditorContext(
      userId,
      {
        languageId: hint.languageId!,
        noteId: hint.noteId!,
        cardId: hint.cardId!,
        focusedField: hint.focusedField,
      },
      database,
    );
  }

  return resolveNonActionableContext(hint);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the allowed suggestion types for a canonical context.
 * This is a convenience helper for the chat request handler.
 */
export function getAllowedSuggestionTypes(
  context: CanonicalChatContext,
): readonly ChatSuggestionType[] {
  return context.allowedSuggestionTypes as readonly ChatSuggestionType[];
}

/**
 * Returns a human-readable example sentence format label for the given format.
 * Exported for use in prompt assembly.
 */
export function getDefaultExampleSentenceFormat(): CardEntryExampleSentenceFormat {
  return DEFAULT_CARD_ENTRY_EXAMPLE_SENTENCE_FORMAT;
}
