import { getActiveUserLanguages, getNoteWithDraftCards } from '@studypuck/database';
import {
  buildCardEntryExampleSentenceFormatInstruction,
  readCardEntryExampleSentenceFormat,
  type CardEntryExampleSentenceFormat,
} from '$lib/card-entry/example-sentence-format.js';
import { filterAddableGroupCards } from '$lib/cards/group-detail.js';
import type { ChatSuggestion, ChatSuggestionType, ChatSurfaceContext } from '$lib/chat.js';
import type { RouteContext } from '$lib/command-bar/shared.js';
import { CardEntryRequestError } from '$lib/server/card-entry.js';
import {
  loadActiveCardDetailData,
  type CardLibraryCardListItemData,
  type CardLibraryGroupData,
  loadCardLibraryData,
  loadCardLibraryGroupsData,
  loadGroupDetailData,
  type CardLibraryGroupListItemData,
} from '$lib/server/cards.js';
import {
  loadCardReviewHomeData,
  loadCardReviewSessionData,
  type CardReviewGroupSummaryData,
  type CardReviewSessionItemData,
  type CardReviewSessionSelection,
} from '$lib/server/card-review.js';
import {
  loadTranslationDrillHomeData,
  type TranslationDrillContextCardData,
  type TranslationDrillHomeData,
} from '$lib/server/translation-drills.js';

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
  allowedSuggestionTypes: readonly ['append_example_sentence', 'append_mnemonic', 'add_inbox_note'];
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

export type ChatCardDetailSnapshot = ChatCardSnapshot & {
  examples: string[];
  mnemonics: string[];
  llmInstructions: string | null;
};

export type ChatGroupSnapshot = {
  groupId: string;
  groupName: string;
  description: string | null;
  activeCardCount: number;
};

export type ChatGroupReference = {
  groupId: string;
  groupName: string;
};

export type CardLibraryListContext = {
  contextType: 'card_library_list';
  languageId: string;
  allowedSuggestionTypes: readonly ['add_inbox_note', 'create_group'];
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
  allowedSuggestionTypes: readonly ['add_inbox_note', 'create_group'];
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
  allowedSuggestionTypes: readonly ['add_inbox_note', 'create_group', 'add_card_to_group', 'remove_card_from_group'];
  group: ChatGroupSnapshot;
  availableGroupsForAddition: ChatGroupReference[];
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
  allowedSuggestionTypes: readonly ['add_inbox_note', 'add_card_to_group'];
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

export type CardDetailDrawerContext = {
  contextType: 'card_detail_drawer';
  languageId: string;
  allowedSuggestionTypes: readonly [
    'append_example_sentence',
    'append_mnemonic',
    'add_inbox_note',
    'add_card_to_group',
    'remove_card_from_group',
  ];
  sourceSurface: 'card_library_list' | 'group_detail';
  likelyTargetCardId: string;
  likelyTargetFocusedField: string | null;
  card: ChatCardDetailSnapshot;
  membershipGroups: ChatGroupReference[];
  addableGroups: ChatGroupReference[];
  group: ChatGroupSnapshot | null;
};

export type NonActionableContext = {
  contextType: 'non_actionable';
  routeContextType: RouteContext['routeContextType'];
  languageId: string | null;
  allowedSuggestionTypes: readonly ['add_inbox_note'] | readonly [];
};

export type CardReviewGroupSnapshot = {
  groupId: string;
  groupName: string;
  activeCardCount: number;
  dueCardCount: number;
  nextDueAtIso: string | null;
};

export type CardReviewCardSnapshot = {
  cardId: string;
  content: string;
  meaning: string | null;
  cardType: string | null;
  groupNames: string[];
  examples: string[];
  mnemonics: string[];
  llmInstructions: string | null;
  nextDueAtIso: string | null;
  reviewCount: number;
};

export type CardReviewSetupContext = {
  contextType: 'card_review_setup';
  languageId: string;
  allowedSuggestionTypes: readonly ['add_inbox_note'];
  selection: CardReviewSessionSelection;
  stats: {
    cardsInRotation: number;
    dueNowCount: number;
    reviewedTodayCount: number;
    currentStreakDays: number;
    lastReviewedAtIso: string | null;
  };
  selectedGroups: CardReviewGroupSnapshot[];
  sessionPreview: {
    selectedGroupCount: number;
    selectedDueCount: number;
    nextDueAtIso: string | null;
  };
};

export type CardReviewSessionContext = {
  contextType: 'card_review_session';
  languageId: string;
  allowedSuggestionTypes: readonly ['add_inbox_note', 'pin_review_card', 'snooze_review_card', 'next_review_card'];
  selection: CardReviewSessionSelection;
  initialTotalCount: number;
  completedCount: number;
  remainingCount: number;
  currentCardNumber: number;
  currentCard: CardReviewCardSnapshot;
  upcomingCards: CardReviewCardSnapshot[];
};

export type TranslationDrillCardSnapshot = {
  cardId: string;
  content: string;
  meaning: string | null;
  cardType: string | null;
  state: 'active' | 'snoozed' | 'dismissed' | 'disabled';
  sourceGroupName: string | null;
  examples: string[];
  mnemonics: string[];
  llmInstructions: string | null;
};

export type TranslationDrillGroupSnapshot = {
  groupId: string;
  groupName: string;
  drawPileName: string | null;
  pileSizeLimit: number;
  remainingCardCount: number;
  activeCardCount: number;
  snoozedCardCount: number;
};

type TranslationDrillAllowedSuggestionType =
  | 'add_inbox_note'
  | 'draw_translation_drill_card'
  | 'snooze_translation_drill_card'
  | 'dismiss_translation_drill_card'
  | 'next_translation_drill_challenge';

type TranslationDrillBaseContext = {
  languageId: string;
  allowedSuggestionTypes: readonly TranslationDrillAllowedSuggestionType[];
  summary: TranslationDrillHomeData['summary'];
  configuredGroups: TranslationDrillGroupSnapshot[];
  visibleContextCards: TranslationDrillCardSnapshot[];
  focusedCardId: string | null;
};

export type TranslationDrillsHomeContext = TranslationDrillBaseContext & {
  contextType: 'translation_drills_home';
  activeChallenge: null;
};

export type TranslationDrillsChallengeContext = TranslationDrillBaseContext & {
  contextType: 'translation_drills_challenge';
  activeChallenge: {
    challengeId: string;
    prompt: string;
    sourceCardIds: string[];
    startedAtIso: string;
    sourceCards: TranslationDrillCardSnapshot[];
  };
};

export type CanonicalChatContext =
  | CardEntryNoteWorkspaceContext
  | CardLibraryListContext
  | GroupsListContext
  | GroupDetailContext
  | AddCardsToGroupDrawerContext
  | CardDetailDrawerContext
  | CardReviewSetupContext
  | CardReviewSessionContext
  | TranslationDrillsHomeContext
  | TranslationDrillsChallengeContext
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
  loadActiveCardDetailData: typeof loadActiveCardDetailData;
  loadCardLibraryData: typeof loadCardLibraryData;
  loadCardLibraryGroupsData: typeof loadCardLibraryGroupsData;
  loadGroupDetailData: typeof loadGroupDetailData;
  loadCardReviewHomeData: typeof loadCardReviewHomeData;
  loadCardReviewSessionData: typeof loadCardReviewSessionData;
  loadTranslationDrillHomeData: typeof loadTranslationDrillHomeData;
};

const defaultResolverDeps: ResolverDeps = {
  loadActiveCardDetailData,
  loadCardLibraryData,
  loadCardLibraryGroupsData,
  loadGroupDetailData,
  loadCardReviewHomeData,
  loadCardReviewSessionData,
  loadTranslationDrillHomeData,
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

function buildCardDetailSnapshot(card: {
  cardId: string;
  content: string;
  meaning: string | null;
  cardType: string | null;
  groups: CardLibraryGroupData[];
  examples: string[];
  mnemonics: string[];
  llmInstructions: string | null;
}): ChatCardDetailSnapshot {
  return {
    cardId: card.cardId,
    content: card.content,
    meaning: card.meaning,
    cardType: card.cardType,
    groupNames: card.groups.map((group) => group.groupName),
    examples: card.examples,
    mnemonics: card.mnemonics,
    llmInstructions: card.llmInstructions,
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

function buildGroupReference(item: Pick<CardLibraryGroupData, 'groupId' | 'groupName'>): ChatGroupReference {
  return {
    groupId: item.groupId,
    groupName: item.groupName,
  };
}

function buildCardReviewGroupSnapshot(group: CardReviewGroupSummaryData): CardReviewGroupSnapshot {
  return {
    groupId: group.groupId,
    groupName: group.groupName,
    activeCardCount: group.activeCardCount,
    dueCardCount: group.dueCardCount,
    nextDueAtIso: group.nextDueAtIso,
  };
}

function buildCardReviewCardSnapshot(item: CardReviewSessionItemData): CardReviewCardSnapshot {
  return {
    cardId: item.cardId,
    content: item.content,
    meaning: item.meaning,
    cardType: item.cardType,
    groupNames: item.groups.map((group) => group.groupName),
    examples: item.examples,
    mnemonics: item.mnemonics,
    llmInstructions: item.llmInstructions,
    nextDueAtIso: item.nextDueAtIso,
    reviewCount: item.reviewCount,
  };
}

function buildTranslationDrillCardSnapshot(card: TranslationDrillContextCardData): TranslationDrillCardSnapshot {
  return {
    cardId: card.cardId,
    content: card.content,
    meaning: card.meaning,
    cardType: card.cardType,
    state: card.state,
    sourceGroupName: card.sourceGroup?.groupName ?? null,
    examples: card.examples,
    mnemonics: card.mnemonics,
    llmInstructions: card.llmInstructions,
  };
}

function buildTranslationDrillGroupSnapshot(
  group: TranslationDrillHomeData['configuredGroups'][number],
): TranslationDrillGroupSnapshot {
  return {
    groupId: group.groupId,
    groupName: group.groupName,
    drawPileName: group.drawPileName,
    pileSizeLimit: group.pileSizeLimit,
    remainingCardCount: group.remainingCardCount,
    activeCardCount: group.activeCards.length,
    snoozedCardCount: group.snoozedCards.length,
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
    allowedSuggestionTypes: ['append_example_sentence', 'append_mnemonic', 'add_inbox_note'],
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
    allowedSuggestionTypes: ['add_inbox_note', 'create_group'],
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
    allowedSuggestionTypes: ['add_inbox_note', 'create_group'],
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
    allowedSuggestionTypes: ['add_inbox_note', 'create_group', 'add_card_to_group', 'remove_card_from_group'],
    group: buildGroupSnapshot(groupDetail.group),
    availableGroupsForAddition: groupDetail.cards.availableGroups
      .filter((group) => group.groupId !== groupDetail.group.groupId)
      .map((group) => buildGroupReference(group)),
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
    allowedSuggestionTypes: ['add_inbox_note', 'add_card_to_group'],
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

async function resolveCardDetailDrawerContext(
  userId: string,
  languageId: string,
  hint: Pick<ChatContextHint, 'focusedField'>,
  surfaceContext: Extract<ChatSurfaceContext, { surface: 'card_detail_drawer' }>,
  database: DatabaseClient,
  deps: ResolverDeps,
): Promise<CardDetailDrawerContext> {
  const activeCard = await deps.loadActiveCardDetailData(
    userId,
    languageId,
    surfaceContext.cardId,
    database,
  );

  let group: ChatGroupSnapshot | null = null;

  if (surfaceContext.sourceSurface === 'group_detail') {
    if (!surfaceContext.groupId) {
      throw new CardEntryRequestError(400, 'Group detail chat context is missing the group identifier.');
    }

    const groupDetail = await deps.loadGroupDetailData(
      userId,
      languageId,
      surfaceContext.groupId,
      new URL(`/${languageId}/cards/groups/${surfaceContext.groupId}`, 'https://studypuck.test'),
      database,
    );

    const cardBelongsToGroup = activeCard.card.groups.some(
      (activeGroup) => activeGroup.groupId === groupDetail.group.groupId,
    );

    if (!cardBelongsToGroup) {
      throw new CardEntryRequestError(404, 'Active card not found in the current group.');
    }

    group = buildGroupSnapshot(groupDetail.group);
  }

  return {
    contextType: 'card_detail_drawer',
    languageId,
      allowedSuggestionTypes: [
        'append_example_sentence',
        'append_mnemonic',
        'add_inbox_note',
        'add_card_to_group',
        'remove_card_from_group',
      ],
    sourceSurface: surfaceContext.sourceSurface,
    likelyTargetCardId: activeCard.card.cardId,
    likelyTargetFocusedField: hint.focusedField ?? null,
    card: buildCardDetailSnapshot(activeCard.card),
    membershipGroups: activeCard.card.groups.map((item) => buildGroupReference(item)),
    addableGroups: activeCard.availableGroups
      .filter((availableGroup) => !activeCard.card.groups.some((groupItem) => groupItem.groupId === availableGroup.groupId))
      .map((item) => buildGroupReference(item)),
    group,
  };
}

function buildCardReviewUrlFromSelection(pathname: string, selection: CardReviewSessionSelection) {
  const url = new URL(pathname, 'https://studypuck.test');
  url.searchParams.delete('group');

  for (const groupId of selection.groupIds) {
    url.searchParams.append('group', groupId);
  }

  if (selection.limit === null || selection.countMode === 'all_due') {
    url.searchParams.delete('limit');
  } else {
    url.searchParams.set('limit', String(selection.limit));
  }

  return url;
}

async function resolveCardReviewSetupContext(
  userId: string,
  languageId: string,
  surfaceContext: Extract<ChatSurfaceContext, { surface: 'card_review_setup' }>,
  routeContext: RouteContext,
  database: DatabaseClient,
  deps: ResolverDeps,
): Promise<CardReviewSetupContext> {
  const home = await deps.loadCardReviewHomeData(
    userId,
    languageId,
    buildCardReviewUrlFromSelection(routeContext.pathname, surfaceContext.selection),
    database,
  );

  return {
    contextType: 'card_review_setup',
    languageId,
    allowedSuggestionTypes: ['add_inbox_note'],
    selection: home.selection,
    stats: home.stats,
    selectedGroups: home.groups
      .filter((group) => home.selection.groupIds.includes(group.groupId))
      .map((group) => buildCardReviewGroupSnapshot(group)),
    sessionPreview: home.sessionPreview,
  };
}

async function resolveCardReviewSessionContext(
  userId: string,
  languageId: string,
  surfaceContext: Extract<ChatSurfaceContext, { surface: 'card_review_session' }>,
  routeContext: RouteContext,
  database: DatabaseClient,
  deps: ResolverDeps,
): Promise<CardReviewSessionContext | NonActionableContext> {
  const session = await deps.loadCardReviewSessionData(
    userId,
    languageId,
    buildCardReviewUrlFromSelection(routeContext.pathname, surfaceContext.selection),
    database,
  );
  const queuedItems = session.items.filter((item) => surfaceContext.queueCardIds.includes(item.cardId));
  const currentCard = queuedItems.find((item) => item.cardId === surfaceContext.currentCardId) ?? null;

  if (!currentCard) {
    return resolveNonActionableContext({
      routeContext,
      languageId,
    });
  }

  return {
    contextType: 'card_review_session',
    languageId,
    allowedSuggestionTypes: ['add_inbox_note', 'pin_review_card', 'snooze_review_card', 'next_review_card'],
    selection: session.selection,
    initialTotalCount: surfaceContext.initialTotalCount,
    completedCount: surfaceContext.completedCount,
    remainingCount: queuedItems.length,
    currentCardNumber: surfaceContext.completedCount + 1,
    currentCard: buildCardReviewCardSnapshot(currentCard),
    upcomingCards: queuedItems
      .filter((item) => item.cardId !== currentCard.cardId)
      .slice(0, CARD_SNAPSHOT_LIMIT)
      .map((item) => buildCardReviewCardSnapshot(item)),
  };
}

function getAllowedTranslationDrillSuggestionTypes(
  home: TranslationDrillHomeData,
): TranslationDrillAllowedSuggestionType[] {
  const allowed: TranslationDrillAllowedSuggestionType[] = ['add_inbox_note'];

  if (home.configuredGroups.some((group) => group.remainingCardCount > 0)) {
    allowed.push('draw_translation_drill_card');
  }

  if (home.challenge.generationInput.activeCardCount > 0) {
    allowed.push('next_translation_drill_challenge');
  }

  const visibleContextCards = [
    ...home.configuredGroups.flatMap((group) => [...group.activeCards, ...group.snoozedCards]),
    ...home.ungroupedContextCards,
  ];

  if (visibleContextCards.some((card) => card.state === 'active')) {
    allowed.push('snooze_translation_drill_card');
  }

  if (visibleContextCards.length > 0) {
    allowed.push('dismiss_translation_drill_card');
  }

  return allowed;
}

async function resolveTranslationDrillsContext(
  userId: string,
  languageId: string,
  surfaceContext: Extract<ChatSurfaceContext, { surface: 'translation_drills' }>,
  database: DatabaseClient,
  deps: ResolverDeps,
): Promise<TranslationDrillsHomeContext | TranslationDrillsChallengeContext> {
  const home = await deps.loadTranslationDrillHomeData(userId, languageId, database);
  const visibleContextCards = [
    ...home.configuredGroups.flatMap((group) => [...group.activeCards, ...group.snoozedCards]),
    ...home.ungroupedContextCards,
  ];
  const visibleContextCardSnapshots = visibleContextCards.map((card) => buildTranslationDrillCardSnapshot(card));
  const visibleContextCardIds = new Set(visibleContextCards.map((card) => card.cardId));
  const baseContext: TranslationDrillBaseContext = {
    languageId,
    allowedSuggestionTypes: getAllowedTranslationDrillSuggestionTypes(home),
    summary: home.summary,
    configuredGroups: home.configuredGroups.map((group) => buildTranslationDrillGroupSnapshot(group)),
    visibleContextCards: visibleContextCardSnapshots,
    focusedCardId:
      surfaceContext.focusedCardId && visibleContextCardIds.has(surfaceContext.focusedCardId)
        ? surfaceContext.focusedCardId
        : null,
  };

  if (!surfaceContext.activeChallenge) {
    return {
      contextType: 'translation_drills_home',
      ...baseContext,
      activeChallenge: null,
    };
  }

  const challengeCardById = new Map(home.challenge.generationInput.cards.map((card) => [card.cardId, card]));
  const sourceCards = surfaceContext.activeChallenge.sourceCardIds
    .map((cardId) => challengeCardById.get(cardId))
    .filter((card): card is TranslationDrillContextCardData => card !== undefined);

  if (sourceCards.length !== surfaceContext.activeChallenge.sourceCardIds.length) {
    return {
      contextType: 'translation_drills_home',
      ...baseContext,
      activeChallenge: null,
    };
  }

  return {
    contextType: 'translation_drills_challenge',
    ...baseContext,
    activeChallenge: {
      challengeId: surfaceContext.activeChallenge.challengeId,
      prompt: surfaceContext.activeChallenge.prompt,
      sourceCardIds: surfaceContext.activeChallenge.sourceCardIds,
      startedAtIso: surfaceContext.activeChallenge.startedAtIso,
      sourceCards: sourceCards.map((card) => buildTranslationDrillCardSnapshot(card)),
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
    allowedSuggestionTypes: hint.languageId ? ['add_inbox_note'] : [],
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
    case 'card_detail_drawer':
      if (
        (surfaceContext.sourceSurface === 'card_library_list' &&
          hint.routeContext.routeContextType !== 'card_library_list') ||
        (surfaceContext.sourceSurface === 'group_detail' &&
          hint.routeContext.routeContextType !== 'group_detail')
      ) {
        return resolveNonActionableContext(hint);
      }

      return resolveCardDetailDrawerContext(
        userId,
        languageId,
        hint,
        surfaceContext,
        database,
        deps,
      );
    case 'card_review_setup':
      if (hint.routeContext.routeContextType !== 'card-review') {
        return resolveNonActionableContext(hint);
      }

      return resolveCardReviewSetupContext(
        userId,
        languageId,
        surfaceContext,
        hint.routeContext,
        database,
        deps,
      );
    case 'card_review_session':
      if (hint.routeContext.routeContextType !== 'card-review') {
        return resolveNonActionableContext(hint);
      }

      return resolveCardReviewSessionContext(
        userId,
        languageId,
        surfaceContext,
        hint.routeContext,
        database,
        deps,
      );
    case 'translation_drills':
      if (hint.routeContext.routeContextType !== 'translation-drills') {
        return resolveNonActionableContext(hint);
      }

      return resolveTranslationDrillsContext(
        userId,
        languageId,
        surfaceContext,
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

function getSuggestionCardIds(
  cards: readonly Pick<ChatCardSnapshot, 'cardId'>[],
) {
  return new Set(cards.map((card) => card.cardId));
}

function getSuggestionGroupIds(
  groups: readonly Pick<ChatGroupReference, 'groupId'>[],
) {
  return new Set(groups.map((group) => group.groupId));
}

function isCreateGroupSuggestionValid(context: CanonicalChatContext) {
  return (
    context.contextType === 'card_library_list' ||
    context.contextType === 'groups_list' ||
    context.contextType === 'group_detail'
  );
}

function isAddCardToGroupSuggestionValid(
  context: CanonicalChatContext,
  payload: Extract<ChatSuggestion, { type: 'add_card_to_group' }>['payload'],
) {
  switch (context.contextType) {
    case 'card_detail_drawer':
      return (
        payload.cardId === context.card.cardId &&
        getSuggestionGroupIds(context.addableGroups).has(payload.groupId)
      );
    case 'group_detail':
      return (
        getSuggestionCardIds([...context.selectedCards, ...context.visibleCards]).has(payload.cardId) &&
        getSuggestionGroupIds(context.availableGroupsForAddition).has(payload.groupId)
      );
    case 'add_cards_to_group_drawer':
      return (
        payload.groupId === context.group.groupId &&
        getSuggestionCardIds([...context.selectedCards, ...context.visibleCards]).has(payload.cardId)
      );
    default:
      return false;
  }
}

function isRemoveCardFromGroupSuggestionValid(
  context: CanonicalChatContext,
  payload: Extract<ChatSuggestion, { type: 'remove_card_from_group' }>['payload'],
) {
  switch (context.contextType) {
    case 'card_detail_drawer':
      return (
        payload.cardId === context.card.cardId &&
        getSuggestionGroupIds(context.membershipGroups).has(payload.groupId)
      );
    case 'group_detail':
      return (
        payload.groupId === context.group.groupId &&
        getSuggestionCardIds([...context.selectedCards, ...context.visibleCards]).has(payload.cardId)
      );
    default:
      return false;
  }
}

function isCardReviewSuggestionValid(
  context: CanonicalChatContext,
  payload: Extract<ChatSuggestion, { type: 'pin_review_card' | 'snooze_review_card' | 'next_review_card' }>['payload'],
) {
  return context.contextType === 'card_review_session' && payload.cardId === context.currentCard.cardId;
}

function isTranslationDrillDrawSuggestionValid(
  context: CanonicalChatContext,
  payload: Extract<ChatSuggestion, { type: 'draw_translation_drill_card' }>['payload'],
) {
  return (
    (context.contextType === 'translation_drills_home' || context.contextType === 'translation_drills_challenge') &&
    context.configuredGroups.some((group) => group.groupId === payload.groupId && group.remainingCardCount > 0)
  );
}

function isTranslationDrillSnoozeSuggestionValid(
  context: CanonicalChatContext,
  payload: Extract<ChatSuggestion, { type: 'snooze_translation_drill_card' }>['payload'],
) {
  return (
    (context.contextType === 'translation_drills_home' || context.contextType === 'translation_drills_challenge') &&
    context.visibleContextCards.some((card) => card.cardId === payload.cardId && card.state === 'active')
  );
}

function isTranslationDrillDismissSuggestionValid(
  context: CanonicalChatContext,
  payload: Extract<ChatSuggestion, { type: 'dismiss_translation_drill_card' }>['payload'],
) {
  return (
    (context.contextType === 'translation_drills_home' || context.contextType === 'translation_drills_challenge') &&
    context.visibleContextCards.some((card) => card.cardId === payload.cardId)
  );
}

function isNextTranslationDrillChallengeSuggestionValid(context: CanonicalChatContext) {
  return (
    (context.contextType === 'translation_drills_home' || context.contextType === 'translation_drills_challenge') &&
    context.allowedSuggestionTypes.includes('next_translation_drill_challenge')
  );
}

export function areChatSuggestionsValidForContext(
  context: CanonicalChatContext,
  suggestions: readonly ChatSuggestion[],
) {
  return suggestions.every((suggestion) => {
    switch (suggestion.type) {
      case 'append_example_sentence':
        if (context.contextType === 'card_entry_note_workspace') {
          return context.draftCards.some((card) => card.cardId === suggestion.payload.cardId);
        }

        if (context.contextType === 'card_detail_drawer') {
          return context.card.cardId === suggestion.payload.cardId;
        }

        return false;
      case 'append_mnemonic':
        if (context.contextType === 'card_entry_note_workspace') {
          return context.draftCards.some((card) => card.cardId === suggestion.payload.cardId);
        }

        if (context.contextType === 'card_detail_drawer') {
          return context.card.cardId === suggestion.payload.cardId;
        }

        return false;
      case 'add_inbox_note':
        return context.languageId !== null;
      case 'create_group':
        return isCreateGroupSuggestionValid(context);
      case 'add_card_to_group':
        return isAddCardToGroupSuggestionValid(context, suggestion.payload);
      case 'remove_card_from_group':
        return isRemoveCardFromGroupSuggestionValid(context, suggestion.payload);
      case 'pin_review_card':
      case 'snooze_review_card':
      case 'next_review_card':
        return isCardReviewSuggestionValid(context, suggestion.payload);
      case 'draw_translation_drill_card':
        return isTranslationDrillDrawSuggestionValid(context, suggestion.payload);
      case 'snooze_translation_drill_card':
        return isTranslationDrillSnoozeSuggestionValid(context, suggestion.payload);
      case 'dismiss_translation_drill_card':
        return isTranslationDrillDismissSuggestionValid(context, suggestion.payload);
      case 'next_translation_drill_challenge':
        return isNextTranslationDrillChallengeSuggestionValid(context);
    }
  });
}
