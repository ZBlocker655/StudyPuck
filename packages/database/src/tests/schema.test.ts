import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import { setupTestDatabase, cleanupTestDatabase, resetTestTables, type TestDb } from '../test-utils.js';
import { eq, and } from 'drizzle-orm';
import { users, studyLanguages } from '../schema/users.js';
import { cards, groups } from '../schema/cards.js';
import { inboxNotes, noteCardLinks, cardEntryDailyStats } from '../schema/card-entry.js';
import { cardReviewSrs, cardReviewDailyStats } from '../schema/card-review.js';
import {
  translationDrillSrs,
  translationDrillDrawPiles,
  translationDrillContext,
  translationDrillDailyStats,
} from '../schema/translation-drills.js';

// Shared test fixtures
const TEST_USER = { userId: 'auth0|schema-test-user', email: 'schema-test@example.com' };
const TEST_LANG = { userId: TEST_USER.userId, languageId: 'zh', languageName: 'Chinese' };
const TEST_CARD = { userId: TEST_USER.userId, languageId: 'zh', cardId: 'card-001', content: '经历' };
const TEST_GROUP = { userId: TEST_USER.userId, languageId: 'zh', groupId: 'group-001', groupName: 'Test Group' };

describe('Full schema — Card Entry tables', () => {
  let db: TestDb;
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    ({ db, sql } = await setupTestDatabase());
    // Insert prerequisite data
    await db.insert(users).values(TEST_USER);
    await db.insert(studyLanguages).values(TEST_LANG);
    await db.insert(cards).values(TEST_CARD);
  });

  afterAll(async () => {
    if (sql) await cleanupTestDatabase(sql);
  });

  beforeEach(async () => {
    await db.delete(noteCardLinks);
    await db.delete(inboxNotes);
    await db.delete(cardEntryDailyStats);
  });

  it('should insert and retrieve an inbox note', async () => {
    const note = {
      userId: TEST_USER.userId,
      languageId: 'zh',
      noteId: 'note-001',
      content: 'Remember to study 经历',
    };
    await db.insert(inboxNotes).values(note);
    const [retrieved] = await db
      .select()
      .from(inboxNotes)
      .where(and(eq(inboxNotes.userId, note.userId), eq(inboxNotes.noteId, note.noteId)));
    expect(retrieved).toBeDefined();
    expect(retrieved.content).toBe(note.content);
    expect(retrieved.state).toBe('unprocessed');
    expect(retrieved.sourceType).toBe('manual');
  });

  it('should create a note-card link', async () => {
    await db.insert(inboxNotes).values({
      userId: TEST_USER.userId,
      languageId: 'zh',
      noteId: 'note-002',
      content: 'Link test',
    });
    await db.insert(noteCardLinks).values({
      userId: TEST_USER.userId,
      languageId: 'zh',
      noteId: 'note-002',
      cardId: TEST_CARD.cardId,
    });
    const links = await db
      .select()
      .from(noteCardLinks)
      .where(eq(noteCardLinks.noteId, 'note-002'));
    expect(links).toHaveLength(1);
    expect(links[0].cardId).toBe(TEST_CARD.cardId);
  });

  it('should track card entry daily stats', async () => {
    const stats = {
      userId: TEST_USER.userId,
      languageId: 'zh',
      date: '2026-02-28',
      notesCaptured: 5,
      cardsPromotedToActive: 2,
    };
    await db.insert(cardEntryDailyStats).values(stats);
    const [retrieved] = await db
      .select()
      .from(cardEntryDailyStats)
      .where(eq(cardEntryDailyStats.date, '2026-02-28'));
    expect(retrieved.notesCaptured).toBe(5);
    expect(retrieved.cardsPromotedToActive).toBe(2);
    expect(retrieved.notesProcessed).toBe(0);
  });

  it('should enforce unique primary key on inbox_notes', async () => {
    await db.insert(inboxNotes).values({
      userId: TEST_USER.userId,
      languageId: 'zh',
      noteId: 'note-dup',
      content: 'First',
    });
    await expect(
      db.insert(inboxNotes).values({
        userId: TEST_USER.userId,
        languageId: 'zh',
        noteId: 'note-dup',
        content: 'Duplicate',
      })
    ).rejects.toThrow();
  });
});

describe('Full schema — Card Review tables', () => {
  let db: TestDb;
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    ({ db, sql } = await setupTestDatabase());
    await db.insert(users).values(TEST_USER);
    await db.insert(studyLanguages).values(TEST_LANG);
    await db.insert(cards).values(TEST_CARD);
  });

  afterAll(async () => {
    if (sql) await cleanupTestDatabase(sql);
  });

  beforeEach(async () => {
    await db.delete(cardReviewDailyStats);
    await db.delete(cardReviewSrs);
  });

  it('should insert and retrieve card review SRS data', async () => {
    const srs = {
      userId: TEST_USER.userId,
      languageId: 'zh',
      cardId: TEST_CARD.cardId,
      nextDue: 1000000,
      intervalDays: 3,
      easeFactor: 2.6,
      reviewCount: 5,
    };
    await db.insert(cardReviewSrs).values(srs);
    const [retrieved] = await db
      .select()
      .from(cardReviewSrs)
      .where(eq(cardReviewSrs.cardId, TEST_CARD.cardId));
    expect(retrieved).toBeDefined();
    expect(retrieved.nextDue).toBe(1000000);
    expect(retrieved.intervalDays).toBe(3);
    expect(retrieved.reviewCount).toBe(5);
    expect(retrieved.easeFactor).toBeCloseTo(2.6, 1);
  });

  it('should default ease_factor to 2.5', async () => {
    await db.insert(cardReviewSrs).values({
      userId: TEST_USER.userId,
      languageId: 'zh',
      cardId: TEST_CARD.cardId,
      nextDue: 0,
    });
    const [retrieved] = await db.select().from(cardReviewSrs);
    expect(retrieved.easeFactor).toBeCloseTo(2.5, 1);
    expect(retrieved.reviewCount).toBe(0);
  });

  it('should record card review daily stats', async () => {
    await db.insert(cardReviewDailyStats).values({
      userId: TEST_USER.userId,
      languageId: 'zh',
      date: '2026-02-28',
      cardsReviewed: 20,
      cardsRatedEasy: 10,
      cardsRatedMedium: 7,
      cardsRatedHard: 3,
    });
    const [retrieved] = await db
      .select()
      .from(cardReviewDailyStats)
      .where(eq(cardReviewDailyStats.date, '2026-02-28'));
    expect(retrieved.cardsReviewed).toBe(20);
    expect(retrieved.cardsRatedEasy).toBe(10);
    expect(retrieved.cardsSnoozed).toBe(0);
  });
});

describe('Full schema — Translation Drill tables', () => {
  let db: TestDb;
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    ({ db, sql } = await setupTestDatabase());
    await db.insert(users).values(TEST_USER);
    await db.insert(studyLanguages).values(TEST_LANG);
    await db.insert(cards).values(TEST_CARD);
    await db.insert(groups).values(TEST_GROUP);
  });

  afterAll(async () => {
    if (sql) await cleanupTestDatabase(sql);
  });

  beforeEach(async () => {
    await db.delete(translationDrillDailyStats);
    await db.delete(translationDrillContext);
    await db.delete(translationDrillSrs);
    await db.delete(translationDrillDrawPiles);
  });

  it('should insert and retrieve translation drill SRS', async () => {
    await db.insert(translationDrillSrs).values({
      userId: TEST_USER.userId,
      languageId: 'zh',
      cardId: TEST_CARD.cardId,
      nextDue: 2000000,
      usageCount: 3,
    });
    const [retrieved] = await db
      .select()
      .from(translationDrillSrs)
      .where(eq(translationDrillSrs.cardId, TEST_CARD.cardId));
    expect(retrieved).toBeDefined();
    expect(retrieved.nextDue).toBe(2000000);
    expect(retrieved.usageCount).toBe(3);
    expect(retrieved.performanceScore).toBeNull();
  });

  it('should insert and retrieve draw pile configuration', async () => {
    await db.insert(translationDrillDrawPiles).values({
      userId: TEST_USER.userId,
      languageId: 'zh',
      groupId: TEST_GROUP.groupId,
      enabled: true,
      pileSizeLimit: 15,
    });
    const [retrieved] = await db
      .select()
      .from(translationDrillDrawPiles)
      .where(eq(translationDrillDrawPiles.groupId, TEST_GROUP.groupId));
    expect(retrieved).toBeDefined();
    expect(retrieved.enabled).toBe(true);
    expect(retrieved.pileSizeLimit).toBe(15);
  });

  it('should insert and retrieve translation drill context', async () => {
    await db.insert(translationDrillContext).values({
      userId: TEST_USER.userId,
      languageId: 'zh',
      cardId: TEST_CARD.cardId,
      state: 'active',
      addedFrom: 'draw_pile:group-001',
      usageCount: 0,
    });
    const [retrieved] = await db
      .select()
      .from(translationDrillContext)
      .where(
        and(
          eq(translationDrillContext.userId, TEST_USER.userId),
          eq(translationDrillContext.cardId, TEST_CARD.cardId)
        )
      );
    expect(retrieved).toBeDefined();
    expect(retrieved.state).toBe('active');
    expect(retrieved.addedFrom).toBe('draw_pile:group-001');
  });

  it('should update context state (snooze)', async () => {
    await db.insert(translationDrillContext).values({
      userId: TEST_USER.userId,
      languageId: 'zh',
      cardId: TEST_CARD.cardId,
      state: 'active',
    });
    await db
      .update(translationDrillContext)
      .set({ state: 'snoozed' })
      .where(eq(translationDrillContext.cardId, TEST_CARD.cardId));
    const [updated] = await db
      .select()
      .from(translationDrillContext)
      .where(eq(translationDrillContext.cardId, TEST_CARD.cardId));
    expect(updated.state).toBe('snoozed');
  });

  it('should record translation drill daily stats', async () => {
    await db.insert(translationDrillDailyStats).values({
      userId: TEST_USER.userId,
      languageId: 'zh',
      date: '2026-02-28',
      sentencesTranslated: 15,
      cardsDrawn: 5,
    });
    const [retrieved] = await db
      .select()
      .from(translationDrillDailyStats)
      .where(eq(translationDrillDailyStats.date, '2026-02-28'));
    expect(retrieved.sentencesTranslated).toBe(15);
    expect(retrieved.cardsDrawn).toBe(5);
    expect(retrieved.cardsDismissed).toBe(0);
  });
});

describe('Full schema — Database views', () => {
  let db: TestDb;
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    ({ db, sql } = await setupTestDatabase());
    await db.insert(users).values(TEST_USER);
    await db.insert(studyLanguages).values(TEST_LANG);
    await db.insert(cards).values({ ...TEST_CARD, status: 'active' });
    await db.insert(translationDrillContext).values({
      userId: TEST_USER.userId,
      languageId: 'zh',
      cardId: TEST_CARD.cardId,
      state: 'active',
      addedFrom: 'draw_pile:group-001',
    });
    await db.insert(cardReviewSrs).values({
      userId: TEST_USER.userId,
      languageId: 'zh',
      cardId: TEST_CARD.cardId,
      nextDue: 0, // overdue
    });
  });

  afterAll(async () => {
    if (sql) await cleanupTestDatabase(sql);
  });

  it('should exist: translation_active_cards view', async () => {
    const result = await sql<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.views
      WHERE table_schema = 'public' AND table_name = 'translation_active_cards'
    `;
    expect(result).toHaveLength(1);
  });

  it('should exist: card_review_due view', async () => {
    const result = await sql<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.views
      WHERE table_schema = 'public' AND table_name = 'card_review_due'
    `;
    expect(result).toHaveLength(1);
  });

  it('should return active cards in translation_active_cards view', async () => {
    const result = await sql<{ card_id: string; content: string }[]>`
      SELECT card_id, content FROM translation_active_cards
      WHERE user_id = ${TEST_USER.userId}
    `;
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].content).toBe(TEST_CARD.content);
  });

  it('should return overdue cards in card_review_due view', async () => {
    const result = await sql<{ card_id: string; next_due: number }[]>`
      SELECT card_id, next_due FROM card_review_due
      WHERE user_id = ${TEST_USER.userId}
    `;
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].card_id).toBe(TEST_CARD.cardId);
  });

  it('should not return snoozed cards in translation_active_cards view', async () => {
    // Snooze the card
    await sql`
      UPDATE translation_drill_context
      SET state = 'snoozed'
      WHERE user_id = ${TEST_USER.userId} AND card_id = ${TEST_CARD.cardId}
    `;
    const result = await sql<{ card_id: string }[]>`
      SELECT card_id FROM translation_active_cards
      WHERE user_id = ${TEST_USER.userId}
    `;
    expect(result).toHaveLength(0);
  });
});
