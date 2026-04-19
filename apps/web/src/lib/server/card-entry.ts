import {
  addCardToGroup,
  createDraftCardFromNote,
  createGroup,
  createInboxNote,
  deleteDraftCards,
  deleteInboxNote,
  deferInboxNote,
  getActiveUserLanguages,
  getCardEntryCounts,
  getCardGroups,
  getCardGroupsForCards,
  getDb,
  getDraftCardsForLanguage,
  getGroups,
  getInboxNote,
  getNoteWithDraftCards,
  listInboxNotes,
  promoteDraftCards,
  removeCardFromGroup,
  signOffNote,
  updateCard,
  type Group,
  type InboxNoteAiState,
  type InboxNoteState,
  type InboxSortOrder,
} from '@studypuck/database';
import { and, eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { cards, noteCardLinks } from '@studypuck/database';
import {
  cardEntryDraftCardUpdateSchema,
  cardEntryNoteContentSchema,
  cardEntryNoteIdSchema,
  editableCardOptionalTextSchema,
  editableGroupNameSchema,
  inboxSortOrderSchema,
} from '$lib/schemas/card-entry.js';

type DatabaseClient = ReturnType<typeof getDb>;
type CardEntryDraftCardUpdate = typeof cardEntryDraftCardUpdateSchema._output;
type EditableOptionalCardText = typeof editableCardOptionalTextSchema._output;

const CARD_ENTRY_SORT_COOKIE_PREFIX = 'card-entry-inbox-sort';

export class CardEntryRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'CardEntryRequestError';
    this.status = status;
  }
}

export type CardEntryShellData = {
  unprocessedNoteCount: number;
};

export type CardEntryInboxItem = {
  noteId: string;
  content: string;
  createdAtIso: string;
  createdAtLabel: string;
  sourceLabel: string;
};

export type CardEntryInboxData = {
  notes: CardEntryInboxItem[];
  sort: InboxSortOrder;
  unprocessedNoteCount: number;
};

export type CardEntryGroupData = {
  groupId: string;
  groupName: string;
};

export type CardEntryDuplicateWarningData = {
  warningId: string;
  title: string;
  similarCardId: string;
  similarCardLabel: string;
  dismissed: boolean;
};

export type CardEntryGroupSuggestionData = {
  groupId: string;
  groupName: string;
  similarityScore: number;
};

export type CardEntryNoteDraftCardData = {
  cardId: string;
  content: string;
  meaning: string | null;
  examples: string[];
  mnemonics: string[];
  llmInstructions: string | null;
  linkedAtIso: string | null;
  groups: CardEntryGroupData[];
  groupSuggestions: CardEntryGroupSuggestionData[];
  duplicateWarnings: CardEntryDuplicateWarningData[];
};

export type CardEntryNoteShellData = {
  noteId: string;
  content: string;
  state: InboxNoteState;
  aiState: InboxNoteAiState;
  createdAtIso: string;
  createdAtLabel: string;
  sourceLabel: string;
  draftCards: CardEntryNoteDraftCardData[];
  availableGroups: CardEntryGroupData[];
};

export type CardEntryDraftSourceNoteData = {
  noteId: string;
  content: string;
  state: InboxNoteState;
  createdAtIso: string | null;
  linkedAtIso: string | null;
};

export type CardEntryDraftListItemData = {
  cardId: string;
  content: string;
  meaning: string | null;
  updatedAtIso: string | null;
  updatedAtLabel: string;
  groups: CardEntryGroupData[];
  sourceNotes: CardEntryDraftSourceNoteData[];
};

export type CardEntryDraftsData = {
  items: CardEntryDraftListItemData[];
  availableGroups: CardEntryGroupData[];
  draftCardCount: number;
};

export function getCardEntrySortCookieName(languageId: string): string {
  return `${CARD_ENTRY_SORT_COOKIE_PREFIX}-${languageId}`;
}

export function readCardEntrySort(
  url: URL,
  cookies: Pick<Cookies, 'get'>,
  languageId: string
): InboxSortOrder {
  const querySort = inboxSortOrderSchema.safeParse(url.searchParams.get('sort'));

  if (querySort.success) {
    return querySort.data;
  }

  const cookieSort = inboxSortOrderSchema.safeParse(cookies.get(getCardEntrySortCookieName(languageId)));

  if (cookieSort.success) {
    return cookieSort.data;
  }

  return 'oldest-first';
}

export function persistCardEntrySort(
  cookies: Pick<Cookies, 'set'>,
  languageId: string,
  sort: InboxSortOrder
) {
  cookies.set(getCardEntrySortCookieName(languageId), sort, {
    path: '/',
    sameSite: 'lax',
  });
}

export function formatCardEntryRelativeTime(date: Date, now = new Date()): string {
  const differenceInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1_000));

  if (differenceInSeconds < 60) {
    return 'Just now';
  }

  const differenceInMinutes = Math.floor(differenceInSeconds / 60);

  if (differenceInMinutes < 60) {
    return `${differenceInMinutes}m ago`;
  }

  const differenceInHours = Math.floor(differenceInMinutes / 60);

  if (differenceInHours < 24) {
    return `${differenceInHours}h ago`;
  }

  const differenceInDays = Math.floor(differenceInHours / 24);

  if (differenceInDays < 7) {
    return `${differenceInDays}d ago`;
  }

  const differenceInWeeks = Math.floor(differenceInDays / 7);

  if (differenceInWeeks < 5) {
    return `${differenceInWeeks}w ago`;
  }

  const differenceInMonths = Math.floor(differenceInDays / 30);

  if (differenceInMonths < 12) {
    return `${differenceInMonths}mo ago`;
  }

  const differenceInYears = Math.floor(differenceInDays / 365);
  return `${differenceInYears}y ago`;
}

export function formatCardEntrySourceLabel(sourceType: string | null | undefined): string {
  if (!sourceType || sourceType === 'manual') {
    return 'Manual';
  }

  return sourceType
    .split(/[_-]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function mapInboxItem(
  note: Awaited<ReturnType<typeof listInboxNotes>>[number],
  now = new Date()
): CardEntryInboxItem {
  const createdAt = note.createdAt;

  if (!createdAt) {
    throw new Error(`Inbox note ${note.noteId} is missing createdAt.`);
  }

  return {
    noteId: note.noteId,
    content: note.content,
    createdAtIso: createdAt.toISOString(),
    createdAtLabel: formatCardEntryRelativeTime(createdAt, now),
    sourceLabel: formatCardEntrySourceLabel(note.sourceType),
  };
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function mapGroup(group: Pick<Group, 'groupId' | 'groupName'>): CardEntryGroupData {
  return {
    groupId: group.groupId,
    groupName: group.groupName,
  };
}

function parseOptionalText(value: unknown): EditableOptionalCardText {
  const parsed = editableCardOptionalTextSchema.safeParse(typeof value === 'string' ? value : '');

  if (!parsed.success) {
    throw new CardEntryRequestError(400, parsed.error.issues[0]?.message ?? 'Card text is invalid.');
  }

  return parsed.data;
}

function mapDraftCard(
  draftCard: NonNullable<Awaited<ReturnType<typeof getNoteWithDraftCards>>>['draftCards'][number],
  groups: CardEntryGroupData[]
): CardEntryNoteDraftCardData {
  return {
    cardId: draftCard.cardId,
    content: draftCard.content,
    meaning: draftCard.meaning ?? null,
    examples: normalizeStringList(draftCard.examples),
    mnemonics: normalizeStringList(draftCard.mnemonics),
    llmInstructions: parseOptionalText(draftCard.llmInstructions ?? ''),
    linkedAtIso: draftCard.linkedAt?.toISOString() ?? null,
    groups,
    groupSuggestions: [],
    duplicateWarnings: [],
  };
}

async function assertUserHasLanguage(
  userId: string,
  languageId: string,
  database: DatabaseClient
): Promise<void> {
  const activeLanguages = await getActiveUserLanguages(userId, database as never);
  const languageExists = activeLanguages.some((language) => language.languageId === languageId);

  if (!languageExists) {
    throw new CardEntryRequestError(404, 'That language is not available for this user.');
  }
}

function parseNoteContent(content: unknown): string {
  const parsed = cardEntryNoteContentSchema.safeParse(typeof content === 'string' ? content : '');

  if (!parsed.success) {
    throw new CardEntryRequestError(400, parsed.error.issues[0]?.message ?? 'Note content is invalid.');
  }

  return parsed.data;
}

function parseEntityId(value: unknown, label: string): string {
  const parsed = cardEntryNoteIdSchema.safeParse(typeof value === 'string' ? value : '');

  if (!parsed.success) {
    throw new CardEntryRequestError(400, parsed.error.issues[0]?.message ?? `${label} identifier is invalid.`);
  }

  return parsed.data;
}

function parseNoteId(noteId: unknown): string {
  return parseEntityId(noteId, 'Note');
}

function parseCardId(cardId: unknown): string {
  return parseEntityId(cardId, 'Card');
}

function parseDraftCardUpdate(input: unknown): CardEntryDraftCardUpdate {
  const parsed = cardEntryDraftCardUpdateSchema.safeParse(input);

  if (!parsed.success) {
    throw new CardEntryRequestError(400, parsed.error.issues[0]?.message ?? 'Draft card update is invalid.');
  }

  return parsed.data;
}

function createGroupId(): string {
  return `group-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
}

async function loadDraftCardGroupsMap(
  userId: string,
  languageId: string,
  cardIds: string[],
  database: DatabaseClient
) {
  if (cardIds.length === 0) {
    return new Map();
  }

  return getCardGroupsForCards(userId, languageId, cardIds, database as never);
}

async function mapWorkspaceDraftCards(
  userId: string,
  languageId: string,
  workspace: NonNullable<Awaited<ReturnType<typeof getNoteWithDraftCards>>>,
  database: DatabaseClient
): Promise<CardEntryNoteDraftCardData[]> {
  const cardIds = workspace.draftCards.map((draftCard) => draftCard.cardId);
  const draftCardGroups = await loadDraftCardGroupsMap(userId, languageId, cardIds, database);

  return workspace.draftCards.map((draftCard) =>
    mapDraftCard(
      draftCard,
      (draftCardGroups.get(draftCard.cardId) ?? []).map((group: Group) => mapGroup(group))
    )
  );
}

async function mapDraftCardsWithSources(
  userId: string,
  languageId: string,
  draftCards: Awaited<ReturnType<typeof getDraftCardsForLanguage>>,
  database: DatabaseClient
): Promise<CardEntryDraftListItemData[]> {
  const cardIds = draftCards.map((draftCard) => draftCard.cardId);
  const draftCardGroups = await loadDraftCardGroupsMap(userId, languageId, cardIds, database);

  return draftCards.map((draftCard) => ({
    cardId: draftCard.cardId,
    content: draftCard.content,
    meaning: parseOptionalText(draftCard.meaning ?? ''),
    updatedAtIso: draftCard.updatedAt?.toISOString() ?? null,
    updatedAtLabel: draftCard.updatedAt ? formatCardEntryRelativeTime(draftCard.updatedAt) : 'Just now',
    groups: (draftCardGroups.get(draftCard.cardId) ?? []).map((group: Group) => mapGroup(group)),
    sourceNotes: draftCard.sourceNotes.map((sourceNote) => ({
      noteId: sourceNote.noteId,
      content: sourceNote.content,
      state: sourceNote.state as InboxNoteState,
      createdAtIso: sourceNote.createdAt?.toISOString() ?? null,
      linkedAtIso: sourceNote.linkedAt?.toISOString() ?? null,
    })),
  }));
}

async function loadWorkspace(
  userId: string,
  languageId: string,
  noteId: string,
  database: DatabaseClient
) {
  const workspace = await getNoteWithDraftCards(userId, languageId, noteId, database as never);

  if (!workspace) {
    throw new CardEntryRequestError(404, 'Card Entry note not found.');
  }

  return workspace;
}

async function assertDraftCardInWorkspace(
  userId: string,
  languageId: string,
  noteId: string,
  cardId: string,
  database: DatabaseClient
) {
  const workspace = await loadWorkspace(userId, languageId, noteId, database);
  const draftCard = workspace.draftCards.find((card) => card.cardId === cardId);

  if (!draftCard) {
    throw new CardEntryRequestError(404, 'Draft card not found for this note.');
  }

  return {
    workspace,
    draftCard,
  };
}

async function resolveGroupSelections(
  userId: string,
  languageId: string,
  selections: CardEntryDraftCardUpdate['groups'],
  database: DatabaseClient
): Promise<CardEntryGroupData[]> {
  const existingGroups = await getGroups(userId, languageId, database as never);
  const groupsById = new Map(existingGroups.map((group) => [group.groupId, group]));
  const groupsByNormalizedName = new Map(
    existingGroups.map((group) => [group.groupName.trim().toLocaleLowerCase(), group])
  );
  const resolvedGroups = new Map<string, CardEntryGroupData>();

  for (const selection of selections) {
    const normalizedName = selection.groupName.trim().toLocaleLowerCase();
    const explicitGroupId = selection.groupId?.trim() || null;

    if (explicitGroupId) {
      const explicitGroup = groupsById.get(explicitGroupId);

      if (!explicitGroup) {
        throw new CardEntryRequestError(404, 'One of the selected groups no longer exists.');
      }

      resolvedGroups.set(explicitGroup.groupId, mapGroup(explicitGroup));
      continue;
    }

    const existingGroup = groupsByNormalizedName.get(normalizedName);

    if (existingGroup) {
      resolvedGroups.set(existingGroup.groupId, mapGroup(existingGroup));
      continue;
    }

    const parsedGroupName = editableGroupNameSchema.safeParse(selection.groupName);

    if (!parsedGroupName.success) {
      throw new CardEntryRequestError(
        400,
        parsedGroupName.error.issues[0]?.message ?? 'Group name is invalid.'
      );
    }

    const createdGroup = await createGroup(
      {
        userId,
        languageId,
        groupId: createGroupId(),
        groupName: parsedGroupName.data,
      },
      database as never
    );

    groupsById.set(createdGroup.groupId, createdGroup);
    groupsByNormalizedName.set(createdGroup.groupName.trim().toLocaleLowerCase(), createdGroup);
    resolvedGroups.set(createdGroup.groupId, mapGroup(createdGroup));
  }

  return Array.from(resolvedGroups.values()).sort((left, right) => left.groupName.localeCompare(right.groupName));
}

async function syncDraftCardGroups(
  userId: string,
  languageId: string,
  cardId: string,
  nextGroups: CardEntryGroupData[],
  database: DatabaseClient
) {
  const currentGroups = await getCardGroups(userId, languageId, cardId, database as never);
  const currentGroupIds = new Set(currentGroups.map((group) => group.groupId));
  const nextGroupIds = new Set(nextGroups.map((group) => group.groupId));

  for (const group of nextGroups) {
    if (!currentGroupIds.has(group.groupId)) {
      await addCardToGroup(
        {
          userId,
          languageId,
          cardId,
          groupId: group.groupId,
        },
        database as never
      );
    }
  }

  for (const group of currentGroups) {
    if (!nextGroupIds.has(group.groupId)) {
      await removeCardFromGroup(userId, languageId, cardId, group.groupId, database as never);
    }
  }

  return nextGroups;
}

async function loadDraftCardData(
  userId: string,
  languageId: string,
  noteId: string,
  cardId: string,
  database: DatabaseClient
): Promise<CardEntryNoteDraftCardData> {
  const { draftCard } = await assertDraftCardInWorkspace(userId, languageId, noteId, cardId, database);
  const draftCardGroups = await getCardGroups(userId, languageId, cardId, database as never);

  return mapDraftCard(draftCard, draftCardGroups.map((group) => mapGroup(group)));
}

export async function loadCardEntryShellData(
  userId: string,
  languageId: string,
  database: DatabaseClient
): Promise<CardEntryShellData> {
  const counts = await getCardEntryCounts(userId, languageId, database as never);

  return {
    unprocessedNoteCount: counts.unprocessedNoteCount,
  };
}

export async function loadCardEntryInboxData(
  userId: string,
  languageId: string,
  sort: InboxSortOrder,
  database: DatabaseClient
): Promise<CardEntryInboxData> {
  const [notes, counts] = await Promise.all([
    listInboxNotes(
      userId,
      languageId,
      {
        state: 'unprocessed',
        sort,
      },
      database as never
    ),
    getCardEntryCounts(userId, languageId, database as never),
  ]);

  return {
    notes: notes.map((note) => mapInboxItem(note)),
    sort,
    unprocessedNoteCount: counts.unprocessedNoteCount,
  };
}

export async function loadCardEntryNoteShellData(
  userId: string,
  languageId: string,
  noteId: string,
  database: DatabaseClient
): Promise<CardEntryNoteShellData> {
  const workspace = await loadWorkspace(userId, languageId, parseNoteId(noteId), database);
  const note = workspace.note;
  const [draftCards, availableGroups] = await Promise.all([
    mapWorkspaceDraftCards(userId, languageId, workspace, database),
    getGroups(userId, languageId, database as never),
  ]);

  if (!note.createdAt) {
    throw new Error(`Inbox note ${note.noteId} is missing createdAt.`);
  }

  return {
    noteId: note.noteId,
    content: note.content,
    state: note.state as InboxNoteState,
    aiState: note.aiState as InboxNoteAiState,
    createdAtIso: note.createdAt.toISOString(),
    createdAtLabel: formatCardEntryRelativeTime(note.createdAt),
    sourceLabel: formatCardEntrySourceLabel(note.sourceType),
    draftCards,
    availableGroups: availableGroups.map((group) => mapGroup(group)),
  };
}

export async function loadCardEntryDraftsData(
  userId: string,
  languageId: string,
  database: DatabaseClient
): Promise<CardEntryDraftsData> {
  const [draftCards, availableGroups] = await Promise.all([
    getDraftCardsForLanguage(userId, languageId, database as never),
    getGroups(userId, languageId, database as never),
  ]);

  return {
    items: await mapDraftCardsWithSources(userId, languageId, draftCards, database),
    availableGroups: availableGroups.map((group) => mapGroup(group)),
    draftCardCount: draftCards.length,
  };
}

export async function createCardEntryNoteForLanguage(
  userId: string,
  languageId: string,
  content: unknown,
  database: DatabaseClient
) {
  await assertUserHasLanguage(userId, languageId, database);

  return createInboxNote(
    {
      userId,
      languageId,
      content: parseNoteContent(content),
      sourceType: 'manual',
    },
    database as never
  );
}

export async function deferCardEntryNoteForLanguage(
  userId: string,
  languageId: string,
  noteId: unknown,
  database: DatabaseClient
) {
  const deferredNote = await deferInboxNote(userId, languageId, parseNoteId(noteId), database as never);

  if (!deferredNote) {
    throw new CardEntryRequestError(404, 'Card Entry note not found.');
  }

  return deferredNote;
}

export async function deleteCardEntryNoteForLanguage(
  userId: string,
  languageId: string,
  noteId: unknown,
  database: DatabaseClient
) {
  const deletedNote = await deleteInboxNote(userId, languageId, parseNoteId(noteId), database as never);

  if (!deletedNote) {
    throw new CardEntryRequestError(404, 'Card Entry note not found.');
  }

  return deletedNote;
}

export async function signOffCardEntryNoteForLanguage(
  userId: string,
  languageId: string,
  noteId: unknown,
  database: DatabaseClient
) {
  try {
    return await signOffNote(userId, languageId, parseNoteId(noteId), database as never);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith('Inbox note not found:')) {
        throw new CardEntryRequestError(404, 'Card Entry note not found.');
      }

      if (error.message.includes('requires at least one group before promotion')) {
        throw new CardEntryRequestError(400, 'Every draft card needs at least one group before it can become active.');
      }

      if (error.message.includes('has no linked')) {
        throw new CardEntryRequestError(400, 'This note has no draft cards to sign off yet.');
      }
    }

    throw error;
  }
}

export async function createCardEntryDraftCardForLanguage(
  userId: string,
  languageId: string,
  noteId: unknown,
  database: DatabaseClient
) {
  const parsedNoteId = parseNoteId(noteId);
  const note = await getInboxNote(userId, languageId, parsedNoteId, database as never);

  if (!note) {
    throw new CardEntryRequestError(404, 'Card Entry note not found.');
  }

  await createDraftCardFromNote(
    {
      userId,
      languageId,
      noteId: parsedNoteId,
      content: '',
      examples: [],
      mnemonics: [],
      llmInstructions: null,
    },
    database as never
  );

  return loadCardEntryNoteShellData(userId, languageId, parsedNoteId, database);
}

export async function updateCardEntryDraftCardForLanguage(
  userId: string,
  languageId: string,
  noteId: unknown,
  cardId: unknown,
  input: unknown,
  database: DatabaseClient
) {
  const parsedNoteId = parseNoteId(noteId);
  const parsedCardId = parseCardId(cardId);
  const parsedInput = parseDraftCardUpdate(input);

  await assertDraftCardInWorkspace(userId, languageId, parsedNoteId, parsedCardId, database);
  const resolvedGroups = await resolveGroupSelections(
    userId,
    languageId,
    parsedInput.groups,
    database
  );

  const updatedCard = await updateCard(
    userId,
    languageId,
    parsedCardId,
    {
      content: parsedInput.content,
      meaning: parsedInput.meaning,
      examples: parsedInput.examples,
      mnemonics: parsedInput.mnemonics,
      llmInstructions: parsedInput.llmInstructions,
    },
    database as never
  );

  if (!updatedCard) {
    throw new CardEntryRequestError(404, 'Draft card not found for this note.');
  }

  await syncDraftCardGroups(userId, languageId, parsedCardId, resolvedGroups, database);

  const [card, availableGroups] = await Promise.all([
    loadDraftCardData(userId, languageId, parsedNoteId, parsedCardId, database),
    getGroups(userId, languageId, database as never),
  ]);

  return {
    card,
    availableGroups: availableGroups.map((group) => mapGroup(group)),
  };
}

export async function removeCardEntryDraftCardForLanguage(
  userId: string,
  languageId: string,
  noteId: unknown,
  cardId: unknown,
  database: DatabaseClient
) {
  const parsedNoteId = parseNoteId(noteId);
  const parsedCardId = parseCardId(cardId);

  await assertDraftCardInWorkspace(userId, languageId, parsedNoteId, parsedCardId, database);

  await database
    .delete(noteCardLinks)
    .where(and(
      eq(noteCardLinks.userId, userId),
      eq(noteCardLinks.languageId, languageId),
      eq(noteCardLinks.noteId, parsedNoteId),
      eq(noteCardLinks.cardId, parsedCardId)
    ));

  const remainingLinks = await database
    .select({ noteId: noteCardLinks.noteId })
    .from(noteCardLinks)
    .where(and(
      eq(noteCardLinks.userId, userId),
      eq(noteCardLinks.languageId, languageId),
      eq(noteCardLinks.cardId, parsedCardId)
    ))
    .limit(1);

  if (remainingLinks.length === 0) {
    const now = new Date();
    await database
      .update(cards)
      .set({
        status: 'deleted',
        deletedAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(cards.userId, userId),
        eq(cards.languageId, languageId),
        eq(cards.cardId, parsedCardId),
        eq(cards.status, 'draft')
      ));
  }

  return loadCardEntryNoteShellData(userId, languageId, parsedNoteId, database);
}

function parseCardIds(cardIds: unknown): string[] {
  if (!Array.isArray(cardIds)) {
    throw new CardEntryRequestError(400, 'At least one draft card must be selected.');
  }

  const parsedCardIds = [...new Set(cardIds.map((cardId) => parseCardId(cardId)))];

  if (parsedCardIds.length === 0) {
    throw new CardEntryRequestError(400, 'At least one draft card must be selected.');
  }

  return parsedCardIds;
}

export async function promoteCardEntryDraftsForLanguage(
  userId: string,
  languageId: string,
  cardIds: unknown,
  database: DatabaseClient
) {
  try {
    return await promoteDraftCards(userId, languageId, parseCardIds(cardIds), database as never);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith('Draft card not found:')) {
        throw new CardEntryRequestError(404, 'One of the selected draft cards no longer exists.');
      }

      if (error.message.includes('requires at least one group before promotion')) {
        throw new CardEntryRequestError(400, 'Every promoted draft needs at least one group before it can become active.');
      }
    }

    throw error;
  }
}

export async function deleteCardEntryDraftsForLanguage(
  userId: string,
  languageId: string,
  cardIds: unknown,
  database: DatabaseClient
) {
  try {
    return await deleteDraftCards(userId, languageId, parseCardIds(cardIds), database as never);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Draft card not found:')) {
      throw new CardEntryRequestError(404, 'One of the selected draft cards no longer exists.');
    }

    throw error;
  }
}
