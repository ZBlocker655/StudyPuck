import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { setupTestDatabase, cleanupTestDatabase, resetTestTables, type TestDb } from '../test-utils.js';
import { users, studyLanguages, cards, inboxNotes, noteCardLinks, cardEntryDailyStats } from '../schema.js';
import {
  createDraftCardFromNote,
  createInboxNote,
  deferInboxNote,
  deleteInboxNote,
  finalizeInboxNoteAiProcessing,
  getCardEntryCounts,
  getDraftCardsForLanguage,
  getNoteWithDraftCards,
  listInboxNotes,
  signOffNote,
  transitionInboxNoteAiState,
  updateInboxNoteAiState,
} from '../card-entry.js';
import { addCardToGroup, createGroup } from '../cards.js';

const TEST_USER = { userId: 'auth0|card-entry-user', email: 'card-entry@example.com' };
const TEST_LANG = { userId: TEST_USER.userId, languageId: 'es', languageName: 'Spanish' };

describe('Card Entry database operations', () => {
  let db: TestDb;
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    ({ db, sql } = await setupTestDatabase());
  });

  afterAll(async () => {
    if (sql) await cleanupTestDatabase(sql);
  });

  beforeEach(async () => {
    await resetTestTables(db);
    await db.insert(users).values(TEST_USER);
    await db.insert(studyLanguages).values(TEST_LANG);
  });

  it('creates inbox notes with default ai_state queued and updates capture stats', async () => {
    const created = await createInboxNote({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      content: 'repasar aunque vs sin embargo',
      sourceType: 'manual',
    }, db);

    expect(created.noteId).toMatch(/^note-/);
    expect(created.state).toBe('unprocessed');
    expect(created.aiState).toBe('queued');

    const [stats] = await db.select().from(cardEntryDailyStats);
    expect(stats.notesCaptured).toBe(1);
    expect(stats.notesProcessed).toBe(0);
  });

  it('lists inbox notes in both oldest-first and newest-first order while hiding processed by default', async () => {
    await db.insert(inboxNotes).values([
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        noteId: 'note-oldest',
        content: 'oldest',
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        noteId: 'note-middle',
        content: 'middle',
        createdAt: new Date('2026-04-02T00:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        noteId: 'note-processed',
        content: 'processed',
        state: 'processed',
        createdAt: new Date('2026-04-03T00:00:00.000Z'),
      },
    ]);

    const oldestFirst = await listInboxNotes(TEST_USER.userId, TEST_LANG.languageId, undefined, db);
    const newestFirst = await listInboxNotes(TEST_USER.userId, TEST_LANG.languageId, {
      sort: 'newest-first',
    }, db);

    expect(oldestFirst.map((note) => note.noteId)).toEqual(['note-oldest', 'note-middle']);
    expect(newestFirst.map((note) => note.noteId)).toEqual(['note-middle', 'note-oldest']);
  });

  it('creates draft cards from a note and exposes them with source-note context', async () => {
    const note = await createInboxNote({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      noteId: 'note-draft-source',
      content: 'hablar de “se me ocurrió”',
      sourceType: 'manual',
    }, db);

    const firstDraft = await createDraftCardFromNote({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      noteId: note.noteId,
      content: 'se me ocurrió',
      meaning: 'it occurred to me',
    }, db);

    const secondDraft = await createDraftCardFromNote({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      noteId: note.noteId,
      content: 'ocurrírsele a alguien',
      meaning: 'to occur to someone',
    }, db);

    const workspace = await getNoteWithDraftCards(TEST_USER.userId, TEST_LANG.languageId, note.noteId, db);
    const drafts = await getDraftCardsForLanguage(TEST_USER.userId, TEST_LANG.languageId, db);
    const counts = await getCardEntryCounts(TEST_USER.userId, TEST_LANG.languageId, db);

    expect(workspace).not.toBeNull();
    expect(workspace!.draftCards.map((card) => card.cardId)).toEqual([firstDraft.cardId, secondDraft.cardId]);
    expect(drafts).toHaveLength(2);
    expect(drafts[0].sourceNotes[0]?.noteId).toBe(note.noteId);
    expect(counts.unprocessedNoteCount).toBe(1);
    expect(counts.draftCardCount).toBe(2);

    const [stats] = await db.select().from(cardEntryDailyStats);
    expect(stats.draftCardsCreated).toBe(2);
  });

  it('signs off a note transactionally by promoting draft cards and marking the note processed', async () => {
    const note = await createInboxNote({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      noteId: 'note-to-sign-off',
      content: 'repasar subjuntivo con para que',
      sourceType: 'manual',
    }, db);

    const draft = await createDraftCardFromNote({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      noteId: note.noteId,
      cardId: 'draft-signoff-card',
      content: 'para que + subjuntivo',
    }, db);

    const group = await createGroup({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      groupId: 'group-signoff',
      groupName: 'Grammar',
    }, db);

    await addCardToGroup({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      cardId: draft.cardId,
      groupId: group.groupId,
    }, db);

    const result = await signOffNote(TEST_USER.userId, TEST_LANG.languageId, note.noteId, db);

    expect(result.promotedCardIds).toEqual([draft.cardId]);
    expect(result.note.state).toBe('processed');

    const [storedCard] = await db
      .select()
      .from(cards)
      .where(eq(cards.cardId, draft.cardId));
    expect(storedCard.status).toBe('active');

    const [storedNote] = await db
      .select()
      .from(inboxNotes)
      .where(eq(inboxNotes.noteId, note.noteId));
    expect(storedNote.state).toBe('processed');

    const [stats] = await db.select().from(cardEntryDailyStats);
    expect(stats.notesProcessed).toBe(1);
    expect(stats.cardsPromotedToActive).toBe(1);
  });

  it('deletes a note by soft-deleting linked draft cards while preserving active cards', async () => {
    const note = await createInboxNote({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      noteId: 'note-delete',
      content: 'cleanup test',
      sourceType: 'manual',
    }, db);

    const draft = await createDraftCardFromNote({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      noteId: note.noteId,
      cardId: 'draft-delete-card',
      content: 'borrador',
    }, db);

    await db.insert(cards).values({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      cardId: 'active-linked-card',
      content: 'activo',
      status: 'active',
    });
    await db.insert(noteCardLinks).values({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      noteId: note.noteId,
      cardId: 'active-linked-card',
    });

    const result = await deleteInboxNote(TEST_USER.userId, TEST_LANG.languageId, note.noteId, db);

    expect(result).not.toBeNull();
    expect(result!.softDeletedDraftCardCount).toBe(1);
    expect(result!.preservedLinkedCardCount).toBe(1);

    const [storedDraft] = await db
      .select()
      .from(cards)
      .where(eq(cards.cardId, draft.cardId));
    expect(storedDraft.status).toBe('deleted');
    expect(storedDraft.deletedAt).not.toBeNull();

    const [storedActive] = await db
      .select()
      .from(cards)
      .where(eq(cards.cardId, 'active-linked-card'));
    expect(storedActive.status).toBe('active');

    const remainingNoteRows = await db
      .select()
      .from(inboxNotes)
      .where(eq(inboxNotes.noteId, note.noteId));
    const remainingLinks = await db
      .select()
      .from(noteCardLinks)
      .where(eq(noteCardLinks.noteId, note.noteId));

    expect(remainingNoteRows).toHaveLength(0);
    expect(remainingLinks).toHaveLength(0);

    const [stats] = await db.select().from(cardEntryDailyStats);
    expect(stats.notesDeleted).toBe(1);
  });

  it('updates ai_state and defer state independently for a note', async () => {
    await createInboxNote({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      noteId: 'note-state-update',
      content: 'pending ai',
      sourceType: 'manual',
    }, db);

    const updatedAi = await updateInboxNoteAiState(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'note-state-update',
      'processing',
      db
    );
    const deferred = await deferInboxNote(TEST_USER.userId, TEST_LANG.languageId, 'note-state-update', db);

    expect(updatedAi?.aiState).toBe('processing');
    expect(deferred?.state).toBe('deferred');

    const [stats] = await db.select().from(cardEntryDailyStats);
    expect(stats.notesDeferred).toBe(1);
  });

  it('claims queued notes for preprocessing and finalizes generated draft cards idempotently', async () => {
    await createInboxNote({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      noteId: 'note-ai-preprocess',
      content: 'anotar cuando usar por si acaso',
      sourceType: 'manual',
    }, db);

    const claimed = await transitionInboxNoteAiState(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'note-ai-preprocess',
      'queued',
      'processing',
      db
    );

    expect(claimed?.aiState).toBe('processing');

    const finalized = await finalizeInboxNoteAiProcessing(
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        noteId: 'note-ai-preprocess',
        draftCards: [
          {
            content: 'por si acaso',
            meaning: 'just in case',
            examples: ['Llevo agua por si acaso.'],
            mnemonics: ['Think of taking something along just in case.'],
          },
        ],
      },
      db
    );

    expect(finalized?.note.aiState).toBe('complete');
    expect(finalized?.draftCards).toHaveLength(1);
    expect(finalized?.draftCards[0]?.content).toBe('por si acaso');

    const finalizedAgain = await finalizeInboxNoteAiProcessing(
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        noteId: 'note-ai-preprocess',
        draftCards: [
          {
            content: 'duplicate draft should not be created',
          },
        ],
      },
      db
    );

    expect(finalizedAgain?.draftCards).toHaveLength(1);

    const counts = await getCardEntryCounts(TEST_USER.userId, TEST_LANG.languageId, db);
    expect(counts.draftCardCount).toBe(1);
  });
});
