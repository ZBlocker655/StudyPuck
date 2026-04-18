import {
  createInboxNote,
  deleteInboxNote,
  deferInboxNote,
  getActiveUserLanguages,
  getCardEntryCounts,
  getDb,
  getInboxNote,
  getNoteWithDraftCards,
  listInboxNotes,
  type InboxNoteAiState,
  type InboxNoteState,
  type InboxSortOrder,
} from '@studypuck/database';
import type { Cookies } from '@sveltejs/kit';
import {
  cardEntryNoteContentSchema,
  cardEntryNoteIdSchema,
  inboxSortOrderSchema,
} from '$lib/schemas/card-entry.js';

type DatabaseClient = ReturnType<typeof getDb>;

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

export type CardEntryNoteShellData = {
  noteId: string;
  content: string;
  state: InboxNoteState;
  aiState: InboxNoteAiState;
  createdAtIso: string;
  createdAtLabel: string;
  sourceLabel: string;
  draftCards: CardEntryNoteDraftCardData[];
};

export type CardEntryNoteDraftCardData = {
  cardId: string;
  content: string;
  meaning: string | null;
  examples: string[];
  mnemonics: string[];
  llmInstructions: string | null;
  linkedAtIso: string | null;
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

function mapDraftCard(
  draftCard: NonNullable<Awaited<ReturnType<typeof getNoteWithDraftCards>>>['draftCards'][number]
): CardEntryNoteDraftCardData {
  return {
    cardId: draftCard.cardId,
    content: draftCard.content,
    meaning: draftCard.meaning ?? null,
    examples: normalizeStringList(draftCard.examples),
    mnemonics: normalizeStringList(draftCard.mnemonics),
    llmInstructions: draftCard.llmInstructions ?? null,
    linkedAtIso: draftCard.linkedAt?.toISOString() ?? null,
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

function parseNoteId(noteId: unknown): string {
  const parsed = cardEntryNoteIdSchema.safeParse(typeof noteId === 'string' ? noteId : '');

  if (!parsed.success) {
    throw new CardEntryRequestError(400, parsed.error.issues[0]?.message ?? 'Note identifier is invalid.');
  }

  return parsed.data;
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
  const workspace = await getNoteWithDraftCards(userId, languageId, parseNoteId(noteId), database as never);

  if (!workspace) {
    throw new CardEntryRequestError(404, 'Card Entry note not found.');
  }

  const note = workspace.note;

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
    draftCards: workspace.draftCards.map((draftCard) => mapDraftCard(draftCard)),
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
