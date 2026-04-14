import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import {
  cardEntryDailyStats,
  cards,
  inboxNotes,
  noteCardLinks,
  type Card,
  type CardEntryDailyStats,
  type InboxNote,
  type NewCard,
  type NewInboxNote,
} from './schema.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = PgDatabase<any, any, any>;
type TransactionCapableDb = AnyDb & {
  transaction: <T>(callback: (tx: AnyDb) => Promise<T>) => Promise<T>;
};

export type InboxNoteState = 'unprocessed' | 'deferred' | 'processed' | 'deleted';
export type InboxNoteAiState = 'queued' | 'processing' | 'complete' | 'failed';
export type InboxSortOrder = 'oldest-first' | 'newest-first';

export type DraftCardSourceNote = Pick<InboxNote, 'noteId' | 'content' | 'state' | 'createdAt'> & {
  linkedAt: Date | null;
};

export type DraftCardWithSources = Card & {
  sourceNotes: DraftCardSourceNote[];
};

export type NoteWithDraftCards = {
  note: InboxNote;
  draftCards: Array<Card & { linkedAt: Date | null }>;
};

export type CardEntryCounts = {
  unprocessedNoteCount: number;
  draftCardCount: number;
};

export type DeleteInboxNoteResult = {
  note: InboxNote;
  softDeletedDraftCardCount: number;
  preservedLinkedCardCount: number;
};

export type SignOffNoteResult = {
  note: InboxNote;
  promotedCardIds: string[];
};

type CardEntryStatsIncrements = Partial<{
  notesCaptured: number;
  notesProcessed: number;
  notesDeferred: number;
  notesDeleted: number;
  draftCardsCreated: number;
  cardsPromotedToActive: number;
  groupsCreated: number;
}>;

export type CreateInboxNoteInput = Omit<NewInboxNote, 'noteId' | 'createdAt'> & {
  noteId?: string;
  aiState?: InboxNoteAiState;
};

export type CreateDraftCardFromNoteInput = Omit<
  NewCard,
  'userId' | 'languageId' | 'cardId' | 'status' | 'createdAt' | 'updatedAt'
> & {
  userId: string;
  languageId: string;
  noteId: string;
  cardId?: string;
};

/** Returns the global lazily-initialised db, importing index only when needed */
async function globalDb(): Promise<AnyDb> {
  return (await import('./index.js')).db as AnyDb;
}

function createId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();

  if (uuid) {
    return `${prefix}-${uuid}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getUtcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function normalizeInboxStates(
  state?: InboxNoteState | InboxNoteState[]
): InboxNoteState[] {
  if (!state) {
    return ['unprocessed'];
  }

  return Array.isArray(state) ? state : [state];
}

async function withTransaction<T>(
  db: AnyDb | undefined,
  callback: (tx: AnyDb) => Promise<T>
): Promise<T> {
  const conn = db ?? await globalDb();
  const transactionCapableConn = conn as TransactionCapableDb;

  if (typeof transactionCapableConn.transaction !== 'function') {
    throw new Error('Card Entry operations require transaction support from the database driver');
  }

  return transactionCapableConn.transaction(callback);
}

async function incrementCardEntryDailyStats(
  userId: string,
  languageId: string,
  increments: CardEntryStatsIncrements,
  db: AnyDb
): Promise<CardEntryDailyStats> {
  const date = getUtcDateKey();
  const [existing] = await db
    .select()
    .from(cardEntryDailyStats)
    .where(and(
      eq(cardEntryDailyStats.userId, userId),
      eq(cardEntryDailyStats.languageId, languageId),
      eq(cardEntryDailyStats.date, date)
    ))
    .limit(1);

  const nextValues = {
    notesCaptured: (existing?.notesCaptured ?? 0) + (increments.notesCaptured ?? 0),
    notesProcessed: (existing?.notesProcessed ?? 0) + (increments.notesProcessed ?? 0),
    notesDeferred: (existing?.notesDeferred ?? 0) + (increments.notesDeferred ?? 0),
    notesDeleted: (existing?.notesDeleted ?? 0) + (increments.notesDeleted ?? 0),
    draftCardsCreated: (existing?.draftCardsCreated ?? 0) + (increments.draftCardsCreated ?? 0),
    cardsPromotedToActive: (existing?.cardsPromotedToActive ?? 0) + (increments.cardsPromotedToActive ?? 0),
    groupsCreated: (existing?.groupsCreated ?? 0) + (increments.groupsCreated ?? 0),
  };

  if (!existing) {
    const [created] = await db
      .insert(cardEntryDailyStats)
      .values({
        userId,
        languageId,
        date,
        ...nextValues,
      })
      .returning();

    return created!;
  }

  const [updated] = await db
    .update(cardEntryDailyStats)
    .set(nextValues)
    .where(and(
      eq(cardEntryDailyStats.userId, userId),
      eq(cardEntryDailyStats.languageId, languageId),
      eq(cardEntryDailyStats.date, date)
    ))
    .returning();

  return updated!;
}

async function getNoteCardIds(
  userId: string,
  languageId: string,
  noteId: string,
  db: AnyDb
): Promise<string[]> {
  const links = await db
    .select({ cardId: noteCardLinks.cardId })
    .from(noteCardLinks)
    .where(and(
      eq(noteCardLinks.userId, userId),
      eq(noteCardLinks.languageId, languageId),
      eq(noteCardLinks.noteId, noteId)
    ))
    .orderBy(asc(noteCardLinks.createdAt));

  return links.map((link) => link.cardId);
}

export async function createInboxNote(
  noteData: CreateInboxNoteInput,
  db?: AnyDb
): Promise<InboxNote> {
  return withTransaction(db, async (tx) => {
    const [created] = await tx
      .insert(inboxNotes)
      .values({
        ...noteData,
        noteId: noteData.noteId ?? createId('note'),
        aiState: noteData.aiState ?? 'complete',
        createdAt: new Date(),
      })
      .returning();

    await incrementCardEntryDailyStats(noteData.userId, noteData.languageId, {
      notesCaptured: 1,
    }, tx);

    return created!;
  });
}

export async function getInboxNote(
  userId: string,
  languageId: string,
  noteId: string,
  db?: AnyDb
): Promise<InboxNote | null> {
  const conn = db ?? await globalDb();
  const result = await conn
    .select()
    .from(inboxNotes)
    .where(and(
      eq(inboxNotes.userId, userId),
      eq(inboxNotes.languageId, languageId),
      eq(inboxNotes.noteId, noteId)
    ))
    .limit(1);

  return result[0] || null;
}

export async function listInboxNotes(
  userId: string,
  languageId: string,
  options?: {
    state?: InboxNoteState | InboxNoteState[];
    sort?: InboxSortOrder;
    limit?: number;
    offset?: number;
  },
  db?: AnyDb
): Promise<InboxNote[]> {
  const conn = db ?? await globalDb();
  const states = normalizeInboxStates(options?.state);
  let query = conn
    .select()
    .from(inboxNotes)
    .where(and(
      eq(inboxNotes.userId, userId),
      eq(inboxNotes.languageId, languageId),
      states.length === 1
        ? eq(inboxNotes.state, states[0])
        : inArray(inboxNotes.state, states)
    ))
    .orderBy(options?.sort === 'newest-first' ? desc(inboxNotes.createdAt) : asc(inboxNotes.createdAt));

  if (typeof options?.offset === 'number') {
    query = query.offset(options.offset);
  }

  if (typeof options?.limit === 'number') {
    query = query.limit(options.limit);
  }

  return query;
}

export async function updateInboxNoteAiState(
  userId: string,
  languageId: string,
  noteId: string,
  aiState: InboxNoteAiState,
  db?: AnyDb
): Promise<InboxNote | null> {
  const conn = db ?? await globalDb();
  const result = await conn
    .update(inboxNotes)
    .set({ aiState })
    .where(and(
      eq(inboxNotes.userId, userId),
      eq(inboxNotes.languageId, languageId),
      eq(inboxNotes.noteId, noteId)
    ))
    .returning();

  return result[0] || null;
}

export async function deferInboxNote(
  userId: string,
  languageId: string,
  noteId: string,
  db?: AnyDb
): Promise<InboxNote | null> {
  return withTransaction(db, async (tx) => {
    const result = await tx
      .update(inboxNotes)
      .set({ state: 'deferred' })
      .where(and(
        eq(inboxNotes.userId, userId),
        eq(inboxNotes.languageId, languageId),
        eq(inboxNotes.noteId, noteId)
      ))
      .returning();

    const note = result[0] || null;

    if (!note) {
      return null;
    }

    await incrementCardEntryDailyStats(userId, languageId, {
      notesDeferred: 1,
    }, tx);

    return note;
  });
}

export async function createDraftCardFromNote(
  input: CreateDraftCardFromNoteInput,
  db?: AnyDb
): Promise<Card> {
  return withTransaction(db, async (tx) => {
    const note = await getInboxNote(input.userId, input.languageId, input.noteId, tx);

    if (!note) {
      throw new Error(`Inbox note not found: ${input.noteId}`);
    }

    const { noteId, ...cardData } = input;
    const cardId = input.cardId ?? createId('card');
    const now = new Date();
    const [createdCard] = await tx
      .insert(cards)
      .values({
        ...cardData,
        cardId,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await tx.insert(noteCardLinks).values({
      userId: input.userId,
      languageId: input.languageId,
      noteId,
      cardId,
      createdAt: now,
    });

    await incrementCardEntryDailyStats(input.userId, input.languageId, {
      draftCardsCreated: 1,
    }, tx);

    return createdCard!;
  });
}

export async function getNoteWithDraftCards(
  userId: string,
  languageId: string,
  noteId: string,
  db?: AnyDb
): Promise<NoteWithDraftCards | null> {
  const conn = db ?? await globalDb();
  const note = await getInboxNote(userId, languageId, noteId, conn);

  if (!note) {
    return null;
  }

  const links = await conn
    .select({ cardId: noteCardLinks.cardId, linkedAt: noteCardLinks.createdAt })
    .from(noteCardLinks)
    .where(and(
      eq(noteCardLinks.userId, userId),
      eq(noteCardLinks.languageId, languageId),
      eq(noteCardLinks.noteId, noteId)
    ))
    .orderBy(asc(noteCardLinks.createdAt));

  const cardIds = links.map((link) => link.cardId);

  if (cardIds.length === 0) {
    return {
      note,
      draftCards: [],
    };
  }

  const draftCards = await conn
    .select()
    .from(cards)
    .where(and(
      eq(cards.userId, userId),
      eq(cards.languageId, languageId),
      eq(cards.status, 'draft'),
      inArray(cards.cardId, cardIds)
    ));

  const draftCardMap = new Map(draftCards.map((card) => [card.cardId, card]));
  const orderedDraftCards = links
    .map((link) => {
      const card = draftCardMap.get(link.cardId);

      if (!card) {
        return null;
      }

      return {
        ...card,
        linkedAt: link.linkedAt,
      };
    })
    .filter((card): card is Card & { linkedAt: Date | null } => Boolean(card));

  return {
    note,
    draftCards: orderedDraftCards,
  };
}

export async function getDraftCardsForLanguage(
  userId: string,
  languageId: string,
  db?: AnyDb
): Promise<DraftCardWithSources[]> {
  const conn = db ?? await globalDb();
  const draftCards = await conn
    .select()
    .from(cards)
    .where(and(
      eq(cards.userId, userId),
      eq(cards.languageId, languageId),
      eq(cards.status, 'draft')
    ))
    .orderBy(desc(cards.updatedAt));

  if (draftCards.length === 0) {
    return [];
  }

  const cardIds = draftCards.map((card) => card.cardId);
  const linkRows = await conn
    .select({
      cardId: noteCardLinks.cardId,
      noteId: inboxNotes.noteId,
      noteContent: inboxNotes.content,
      noteState: inboxNotes.state,
      noteCreatedAt: inboxNotes.createdAt,
      linkedAt: noteCardLinks.createdAt,
    })
    .from(noteCardLinks)
    .innerJoin(inboxNotes, and(
      eq(inboxNotes.userId, noteCardLinks.userId),
      eq(inboxNotes.languageId, noteCardLinks.languageId),
      eq(inboxNotes.noteId, noteCardLinks.noteId)
    ))
    .where(and(
      eq(noteCardLinks.userId, userId),
      eq(noteCardLinks.languageId, languageId),
      inArray(noteCardLinks.cardId, cardIds)
    ))
    .orderBy(asc(noteCardLinks.createdAt));

  const sourcesByCardId = new Map<string, DraftCardSourceNote[]>();

  for (const row of linkRows) {
    const existingSources = sourcesByCardId.get(row.cardId) ?? [];
    existingSources.push({
      noteId: row.noteId,
      content: row.noteContent,
      state: row.noteState,
      createdAt: row.noteCreatedAt,
      linkedAt: row.linkedAt,
    });
    sourcesByCardId.set(row.cardId, existingSources);
  }

  return draftCards.map((card) => ({
    ...card,
    sourceNotes: sourcesByCardId.get(card.cardId) ?? [],
  }));
}

export async function getCardEntryCounts(
  userId: string,
  languageId: string,
  db?: AnyDb
): Promise<CardEntryCounts> {
  const conn = db ?? await globalDb();
  const [unprocessedResult, draftResult] = await Promise.all([
    conn
      .select({ count: sql<number>`count(*)` })
      .from(inboxNotes)
      .where(and(
        eq(inboxNotes.userId, userId),
        eq(inboxNotes.languageId, languageId),
        eq(inboxNotes.state, 'unprocessed')
      )),
    conn
      .select({ count: sql<number>`count(*)` })
      .from(cards)
      .where(and(
        eq(cards.userId, userId),
        eq(cards.languageId, languageId),
        eq(cards.status, 'draft')
      )),
  ]);

  return {
    unprocessedNoteCount: Number(unprocessedResult[0]?.count ?? 0),
    draftCardCount: Number(draftResult[0]?.count ?? 0),
  };
}

export async function signOffNote(
  userId: string,
  languageId: string,
  noteId: string,
  db?: AnyDb
): Promise<SignOffNoteResult> {
  return withTransaction(db, async (tx) => {
    const note = await getInboxNote(userId, languageId, noteId, tx);

    if (!note) {
      throw new Error(`Inbox note not found: ${noteId}`);
    }

    const linkedCardIds = await getNoteCardIds(userId, languageId, noteId, tx);

    if (linkedCardIds.length === 0) {
      throw new Error(`Cannot sign off note ${noteId} because it has no linked cards`);
    }

    const linkedDraftCards = await tx
      .select({ cardId: cards.cardId })
      .from(cards)
      .where(and(
        eq(cards.userId, userId),
        eq(cards.languageId, languageId),
        eq(cards.status, 'draft'),
        inArray(cards.cardId, linkedCardIds)
      ));

    const draftCardIds = linkedDraftCards.map((card) => card.cardId);

    if (draftCardIds.length === 0) {
      throw new Error(`Cannot sign off note ${noteId} because it has no linked draft cards`);
    }

    const now = new Date();
    await tx
      .update(cards)
      .set({
        status: 'active',
        updatedAt: now,
      })
      .where(and(
        eq(cards.userId, userId),
        eq(cards.languageId, languageId),
        inArray(cards.cardId, draftCardIds)
      ));

    const noteResult = await tx
      .update(inboxNotes)
      .set({ state: 'processed' })
      .where(and(
        eq(inboxNotes.userId, userId),
        eq(inboxNotes.languageId, languageId),
        eq(inboxNotes.noteId, noteId)
      ))
      .returning();

    await incrementCardEntryDailyStats(userId, languageId, {
      notesProcessed: 1,
      cardsPromotedToActive: draftCardIds.length,
    }, tx);

    return {
      note: noteResult[0]!,
      promotedCardIds: draftCardIds,
    };
  });
}

export async function deleteInboxNote(
  userId: string,
  languageId: string,
  noteId: string,
  db?: AnyDb
): Promise<DeleteInboxNoteResult | null> {
  return withTransaction(db, async (tx) => {
    const note = await getInboxNote(userId, languageId, noteId, tx);

    if (!note) {
      return null;
    }

    const linkedCardIds = await getNoteCardIds(userId, languageId, noteId, tx);
    let softDeletedDraftCardCount = 0;
    let preservedLinkedCardCount = 0;

    if (linkedCardIds.length > 0) {
      const linkedCards = await tx
        .select({ cardId: cards.cardId, status: cards.status })
        .from(cards)
        .where(and(
          eq(cards.userId, userId),
          eq(cards.languageId, languageId),
          inArray(cards.cardId, linkedCardIds)
        ));

      const draftCardIds = linkedCards
        .filter((card) => card.status === 'draft')
        .map((card) => card.cardId);
      preservedLinkedCardCount = linkedCards.length - draftCardIds.length;

      if (draftCardIds.length > 0) {
        const now = new Date();
        await tx
          .update(cards)
          .set({
            status: 'deleted',
            deletedAt: now,
            updatedAt: now,
          })
          .where(and(
            eq(cards.userId, userId),
            eq(cards.languageId, languageId),
            inArray(cards.cardId, draftCardIds)
          ));

        softDeletedDraftCardCount = draftCardIds.length;
      }

      await tx
        .delete(noteCardLinks)
        .where(and(
          eq(noteCardLinks.userId, userId),
          eq(noteCardLinks.languageId, languageId),
          eq(noteCardLinks.noteId, noteId)
        ));
    }

    await tx
      .delete(inboxNotes)
      .where(and(
        eq(inboxNotes.userId, userId),
        eq(inboxNotes.languageId, languageId),
        eq(inboxNotes.noteId, noteId)
      ));

    await incrementCardEntryDailyStats(userId, languageId, {
      notesDeleted: 1,
    }, tx);

    return {
      note,
      softDeletedDraftCardCount,
      preservedLinkedCardCount,
    };
  });
}
