import { getActiveUserLanguages, getNoteWithDraftCards } from '@studypuck/database';
import {
  buildCardEntryExampleSentenceFormatInstruction,
  readCardEntryExampleSentenceFormat,
  type CardEntryExampleSentenceFormat,
} from '$lib/card-entry/example-sentence-format.js';
import type { ChatSuggestionType } from '$lib/chat.js';
import type { RouteContext } from '$lib/command-bar/shared.js';
import { CardEntryRequestError } from '$lib/server/card-entry.js';

type DatabaseClient = NonNullable<Parameters<typeof getNoteWithDraftCards>[3]>;

// ── Canonical context types ──────────────────────────────────────────────────

export type NoteWorkspaceDraftCardSummary = {
  cardId: string;
  content: string;
  meaning: string | null;
  examples: string[];
  mnemonics: string[];
  llmInstructions: string | null;
};

export type CardEntryNoteWorkspaceContext = {
  contextType: 'card_entry_note_workspace';
  languageId: string;
  noteId: string;
  noteContent: string;
  likelyTargetCardId: string | null;
  likelyTargetFocusedField: string | null;
  allowedSuggestionTypes: readonly ChatSuggestionType[];
  exampleSentenceFormat: CardEntryExampleSentenceFormat;
  exampleSentenceFormatInstruction: string;
  draftCards: NoteWorkspaceDraftCardSummary[];
};

export type NonActionableContext = {
  contextType: 'non_actionable';
  routeContextType: RouteContext['routeContextType'];
  languageId: string | null;
  allowedSuggestionTypes: readonly [];
};

export type CanonicalChatContext = CardEntryNoteWorkspaceContext | NonActionableContext;

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

async function resolveCardEntryNoteWorkspaceContext(
  userId: string,
  hint: Required<Pick<ChatContextHint, 'languageId' | 'noteId'>> &
    Pick<ChatContextHint, 'cardId' | 'focusedField'>,
  database: DatabaseClient,
): Promise<CardEntryNoteWorkspaceContext> {
  const workspace = await getNoteWithDraftCards(userId, hint.languageId, hint.noteId, database);

  if (!workspace) {
    throw new CardEntryRequestError(404, 'Card Entry note not found.');
  }

  const languages = await getActiveUserLanguages(userId, database);
  const language = languages.find((lang) => lang.languageId === hint.languageId) ?? null;
  const exampleSentenceFormat = readCardEntryExampleSentenceFormat(language?.settings);
  const draftCards = workspace.draftCards.map((draftCard) => ({
    cardId: draftCard.cardId,
    content: draftCard.content,
    meaning: draftCard.meaning,
    examples: toStringArray(draftCard.examples),
    mnemonics: toStringArray(draftCard.mnemonics),
    llmInstructions: draftCard.llmInstructions,
  }));
  const likelyTargetCardId =
    draftCards.find((draftCard) => draftCard.cardId === hint.cardId)?.cardId ??
    (draftCards.length === 1 ? draftCards[0]?.cardId ?? null : null);

  return {
    contextType: 'card_entry_note_workspace',
    languageId: hint.languageId,
    noteId: hint.noteId,
    noteContent: workspace.note.content,
    likelyTargetCardId,
    likelyTargetFocusedField: likelyTargetCardId ? hint.focusedField ?? null : null,
    allowedSuggestionTypes: ['append_example_sentence'],
    exampleSentenceFormat,
    exampleSentenceFormatInstruction: buildCardEntryExampleSentenceFormatInstruction({
      exampleSentenceFormat,
      languageId: hint.languageId,
    }),
    draftCards,
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
 * When the request comes from the Card Entry note workspace (card-entry context
 * with a valid noteId), the backend loads the note and draft cards from the
 * database, verifies ownership, and constructs a context that includes the
 * workspace plus an optional likely-target-card hint.
 *
 * For all other contexts the backend constructs a lightweight non-actionable
 * context with no DB lookups.
 */
export async function resolveCanonicalChatContext(
  userId: string,
  hint: ChatContextHint,
  database: DatabaseClient | null,
): Promise<CanonicalChatContext> {
  const { languageId, noteId, cardId, focusedField } = hint;

  if (
    hint.routeContext.routeContextType === 'card-entry' &&
    languageId &&
    noteId &&
    database !== null
  ) {
    return resolveCardEntryNoteWorkspaceContext(
      userId,
      { languageId, noteId, cardId, focusedField },
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
