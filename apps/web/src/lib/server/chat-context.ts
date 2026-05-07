import { getActiveUserLanguages, getNoteWithDraftCards } from '@studypuck/database';
import {
  buildCardEntryExampleSentenceFormatInstruction,
  readCardEntryExampleSentenceFormat,
  type CardEntryExampleSentenceFormat,
} from '$lib/card-entry/example-sentence-format.js';
import { filterAddableGroupCards } from '$lib/cards/group-detail.js';
import type { ChatSuggestionType, ChatSurfaceContext } from '$lib/chat.js';
import type { RouteContext } from '$lib/command-bar/shared.js';
import { CardEntryRequestError } from '$lib/server/card-entry.js';
import {
  loadCardLibraryData,
  loadCardLibraryGroupsData,
  loadGroupDetailData,
  type CardLibraryCardListItemData,
  type CardLibraryGroupListItemData,
  type CardLibraryGroupData,
} from '$lib/server/cards.js';

type DatabaseClient = NonNullable<Parameters<typeof getNoteWithDraftCards>[3]>;

const CARD_SNAPSHOT_LIMIT = 12;
const GROUP_SNAPSHOT_LIMIT = 12;

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

export type ChatCardSnapshot = {
  cardId: string;
  content: string;
  meaning: string | null;
  cardType: string | null;
  groupNames: string[];
};

export type ChatGroupSnapshot = {
  groupId: string;
  groupName: string;
  description: string | null;
  activeCardCount: number;
};

export type CardLibraryListContext = {
  contextType: 'card_library_list';
  languageId: string;
  allowedSuggestionTypes: readonly [];
  listState: {
    searchText: string;
    groupFilters: CardLibraryGroupData[];
    cardType: string | null;
    ordering: 'updated_desc';
  };
  resultCount: number;
  selectedCardIds: string[];
  selectedCards: ChatCardSnapshot[];
  visibleCards: ChatCardSnapshot[];
};

export type GroupsListContext = {
  contextType: 'groups_list';
  languageId: string;
  allowedSuggestionTypes: readonly [];
  listState: {
    scope: 'all_groups_for_language';
    ordering: 'group_name_asc';
  };
  resultCount: number;
  visibleGroups: ChatGroupSnapshot[];
};

export type GroupDetailContext = {
  contextType: 'group_detail';
  languageId: string;
  allowedSuggestionTypes: readonly [];
  group: ChatGroupSnapshot;
  listState: {
    searchText: string;
    cardType: string | null;
    scopeGroupId: string;
    ordering: 'updated_desc';
  };
  resultCount: number;
  selectedCardIds: string[];
  selectedCards: ChatCardSnapshot[];
  visibleCards: ChatCardSnapshot[];
};

export type AddCardsToGroupDrawerContext = {
  contextType: 'add_cards_to_group_drawer';
  languageId: string;
  allowedSuggestionTypes: readonly [];
  group: ChatGroupSnapshot;
  listState: {
    searchText: string;
    excludedGroupId: string;
    scope: 'active_language_cards_not_in_target_group';
    ordering: 'updated_desc';
  };
  candidateCount: number;
  selectedCardIds: string[];
  selectedCards: ChatCardSnapshot[];
  visibleCards: ChatCardSnapshot[];
};

export type NonActionableContext = {
  contextType: 'non_actionable';
  routeContextType: RouteContext['routeContextType'];
  languageId: string | null;
  allowedSuggestionTypes: readonly [];
};

export type CanonicalChatContext =
  | CardEntryNoteWorkspaceContext
  | CardLibraryListContext
  | GroupsListContext
  | GroupDetailContext
  | AddCardsToGroupDrawerContext
  | NonActionableContext;

// ── Context hint (derived from the client request) ───────────────────────────

export type ChatContextHint = {
  routeContext: RouteContext;
  languageId?: string;
  noteId?: string;
  cardId?: string;
  focusedField?: string;
  surfaceContext?: ChatSurfaceContext;
};

type ResolverDeps = {
  loadCardLibraryData: typeof loadCardLibraryData;
  loadCardLibraryGroupsData: typeof loadCardLibraryGroupsData;
  loadGroupDetailData: typeof loadGroupDetailData;
};

const defaultResolverDeps: ResolverDeps = {
  loadCardLibraryData,
  loadCardLibraryGroupsData,
  loadGroupDetailData,
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

function buildUrlFromFilters(
  pathname: string,
  filters:
    | Extract<ChatSurfaceContext, { surface: 'card_library_list' }>['filters']
    | Extract<ChatSurfaceContext, { surface: 'group_detail' }>['filters'],
) {
  const url = new URL(pathname, 'https://studypuck.test');

  if (filters.searchText.trim().length > 0) {
    url.searchParams.set('q', filters.searchText.trim());
  }

  if ('groupIds' in filters) {
    url.searchParams.delete('group');

    for (const groupId of filters.groupIds) {
      url.searchParams.append('group', groupId);
    }
  }

  if (filters.cardType) {
    url.searchParams.set('type', filters.cardType);
  }

  return url;
}

function dedupeIds(ids: string[]) {
  return [...new Set(ids)];
}

function buildCardSnapshot(item: CardLibraryCardListItemData): ChatCardSnapshot {
  return {
    cardId: item.cardId,
    content: item.content,
    meaning: item.meaning,
    cardType: item.cardType,
    groupNames: item.groups.map((group) => group.groupName),
  };
}

function buildGroupSnapshot(item: CardLibraryGroupListItemData): ChatGroupSnapshot {
  return {
    groupId: item.groupId,
    groupName: item.groupName,
    description: item.description,
    activeCardCount: item.activeCardCount,
  };
}

function selectCardSnapshots(items: CardLibraryCardListItemData[], selectedCardIds: string[]) {
  const itemsById = new Map(items.map((item) => [item.cardId, item]));

  return dedupeIds(selectedCardIds)
    .map((cardId) => itemsById.get(cardId))
    .filter((item): item is CardLibraryCardListItemData => item !== undefined)
    .map((item) => buildCardSnapshot(item));
}

function sliceCardSnapshots(items: CardLibraryCardListItemData[]) {
  return items.slice(0, CARD_SNAPSHOT_LIMIT).map((item) => buildCardSnapshot(item));
}

function sliceGroupSnapshots(items: CardLibraryGroupListItemData[]) {
  return items.slice(0, GROUP_SNAPSHOT_LIMIT).map((item) => buildGroupSnapshot(item));
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

async function resolveCardLibraryListContext(
  userId: string,
  languageId: string,
  surfaceContext: Extract<ChatSurfaceContext, { surface: 'card_library_list' }>,
  routeContext: RouteContext,
  database: DatabaseClient,
  deps: ResolverDeps,
): Promise<CardLibraryListContext> {
  const library = await deps.loadCardLibraryData(
    userId,
    languageId,
    buildUrlFromFilters(routeContext.pathname, surfaceContext.filters),
    database,
  );
  const groupFilters = library.availableGroups
    .filter((group) => library.filters.groupIds.includes(group.groupId))
    .map((group) => ({
      groupId: group.groupId,
      groupName: group.groupName,
    }));

  return {
    contextType: 'card_library_list',
    languageId,
    allowedSuggestionTypes: [],
    listState: {
      searchText: library.filters.searchText,
      groupFilters,
      cardType: library.filters.cardType,
      ordering: 'updated_desc',
    },
    resultCount: library.totalCount,
    selectedCardIds: dedupeIds(surfaceContext.selectedCardIds),
    selectedCards: selectCardSnapshots(library.items, surfaceContext.selectedCardIds),
    visibleCards: sliceCardSnapshots(library.items),
  };
}

async function resolveGroupsListContext(
  userId: string,
  languageId: string,
  database: DatabaseClient,
  deps: ResolverDeps,
): Promise<GroupsListContext> {
  const groups = await deps.loadCardLibraryGroupsData(userId, languageId, database);

  return {
    contextType: 'groups_list',
    languageId,
    allowedSuggestionTypes: [],
    listState: {
      scope: 'all_groups_for_language',
      ordering: 'group_name_asc',
    },
    resultCount: groups.totalCount,
    visibleGroups: sliceGroupSnapshots(groups.items),
  };
}

async function resolveGroupDetailContext(
  userId: string,
  languageId: string,
  surfaceContext: Extract<ChatSurfaceContext, { surface: 'group_detail' }>,
  routeContext: RouteContext,
  database: DatabaseClient,
  deps: ResolverDeps,
): Promise<GroupDetailContext> {
  const groupDetail = await deps.loadGroupDetailData(
    userId,
    languageId,
    surfaceContext.groupId,
    buildUrlFromFilters(routeContext.pathname, surfaceContext.filters),
    database,
  );

  return {
    contextType: 'group_detail',
    languageId,
    allowedSuggestionTypes: [],
    group: buildGroupSnapshot(groupDetail.group),
    listState: {
      searchText: groupDetail.cards.filters.searchText,
      cardType: groupDetail.cards.filters.cardType,
      scopeGroupId: groupDetail.group.groupId,
      ordering: 'updated_desc',
    },
    resultCount: groupDetail.cards.totalCount,
    selectedCardIds: dedupeIds(surfaceContext.selectedCardIds),
    selectedCards: selectCardSnapshots(groupDetail.cards.items, surfaceContext.selectedCardIds),
    visibleCards: sliceCardSnapshots(groupDetail.cards.items),
  };
}

async function resolveAddCardsToGroupDrawerContext(
  userId: string,
  languageId: string,
  surfaceContext: Extract<ChatSurfaceContext, { surface: 'add_cards_to_group_drawer' }>,
  routeContext: RouteContext,
  database: DatabaseClient,
  deps: ResolverDeps,
): Promise<AddCardsToGroupDrawerContext> {
  const groupDetail = await deps.loadGroupDetailData(
    userId,
    languageId,
    surfaceContext.groupId,
    new URL(routeContext.pathname, 'https://studypuck.test'),
    database,
  );
  const filteredCandidates = filterAddableGroupCards(groupDetail.addableCards.items, surfaceContext.searchText);

  return {
    contextType: 'add_cards_to_group_drawer',
    languageId,
    allowedSuggestionTypes: [],
    group: buildGroupSnapshot(groupDetail.group),
    listState: {
      searchText: surfaceContext.searchText.trim(),
      excludedGroupId: groupDetail.group.groupId,
      scope: 'active_language_cards_not_in_target_group',
      ordering: 'updated_desc',
    },
    candidateCount: filteredCandidates.length,
    selectedCardIds: dedupeIds(surfaceContext.selectedCardIds),
    selectedCards: selectCardSnapshots(groupDetail.addableCards.items, surfaceContext.selectedCardIds),
    visibleCards: sliceCardSnapshots(filteredCandidates),
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
 * For supported Card Library surfaces, the backend validates the surface hint
 * and assembles an authoritative list/group snapshot that matches the active
 * list state producing the visible items.
 *
 * All other contexts fall back to a lightweight non-actionable context.
 */
export async function resolveCanonicalChatContext(
  userId: string,
  hint: ChatContextHint,
  database: DatabaseClient | null,
  deps: ResolverDeps = defaultResolverDeps,
): Promise<CanonicalChatContext> {
  const { languageId, noteId, cardId, focusedField, surfaceContext } = hint;

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

  if (!languageId || database === null || !surfaceContext) {
    return resolveNonActionableContext(hint);
  }

  switch (surfaceContext.surface) {
    case 'card_library_list':
      if (hint.routeContext.routeContextType !== 'card_library_list') {
        return resolveNonActionableContext(hint);
      }

      return resolveCardLibraryListContext(
        userId,
        languageId,
        surfaceContext,
        hint.routeContext,
        database,
        deps,
      );
    case 'groups_list':
      if (hint.routeContext.routeContextType !== 'groups_list') {
        return resolveNonActionableContext(hint);
      }

      return resolveGroupsListContext(userId, languageId, database, deps);
    case 'group_detail':
      if (hint.routeContext.routeContextType !== 'group_detail') {
        return resolveNonActionableContext(hint);
      }

      return resolveGroupDetailContext(
        userId,
        languageId,
        surfaceContext,
        hint.routeContext,
        database,
        deps,
      );
    case 'add_cards_to_group_drawer':
      if (hint.routeContext.routeContextType !== 'group_detail') {
        return resolveNonActionableContext(hint);
      }

      return resolveAddCardsToGroupDrawerContext(
        userId,
        languageId,
        surfaceContext,
        hint.routeContext,
        database,
        deps,
      );
  }
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
