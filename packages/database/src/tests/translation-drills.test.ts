import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { setupTestDatabase, cleanupTestDatabase, resetTestTables, type TestDb } from '../test-utils.js';
import {
  cardGroups,
  cards,
  groups,
  studyLanguages,
  translationDrillContext,
  translationDrillDailyStats,
  translationDrillSrs,
  users,
} from '../schema.js';
import {
  disableTranslationDrillCard,
  dismissTranslationDrillCard,
  drawTranslationDrillCard,
  getTranslationDrillDismissSchedule,
  listTranslationDrillChallengeCards,
  listTranslationDrillContextCards,
  listTranslationDrillDrawPileGroups,
  pinCardToTranslationDrillsContext,
  recordTranslationDrillChallengeUsage,
  snoozeTranslationDrillCard,
  upsertTranslationDrillDrawPile,
} from '../translation-drills.js';

const TEST_USER = { userId: 'auth0|translation-drills-user', email: 'translation-drills@example.com' };
const TEST_LANG = { userId: TEST_USER.userId, languageId: 'zh', languageName: 'Chinese', cefrLevel: 'B1' };
const NOW = new Date('2026-05-10T12:00:00.000Z');

describe('Translation Drills database operations', () => {
  let db: TestDb;
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    ({ db, sql } = await setupTestDatabase());
  });

  afterAll(async () => {
    if (sql) {
      await cleanupTestDatabase(sql);
    }
  });

  beforeEach(async () => {
    await resetTestTables(db);
    await db.insert(users).values(TEST_USER);
    await db.insert(studyLanguages).values(TEST_LANG);
  });

  async function seedLibrary() {
    await db.insert(groups).values([
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        groupId: 'group-core',
        groupName: 'Core',
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        groupId: 'group-extended',
        groupName: 'Extended',
      },
    ]);

    await db.insert(cards).values([
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-due',
        content: '补偿',
        status: 'active',
        meaning: 'to compensate',
        llmInstructions: 'Prefer sentence-final aspect markers',
        updatedAt: new Date('2026-05-01T12:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-new',
        content: '巩固',
        status: 'active',
        meaning: 'to consolidate',
        updatedAt: new Date('2026-05-05T12:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-active',
        content: '经历',
        status: 'active',
        meaning: 'experience',
        updatedAt: new Date('2026-05-03T12:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-snoozed',
        content: '感觉',
        status: 'active',
        meaning: 'feeling',
        updatedAt: new Date('2026-05-04T12:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-disabled',
        content: '停用',
        status: 'active',
        meaning: 'disable',
        updatedAt: new Date('2026-05-02T12:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-pinned',
        content: '把握',
        status: 'active',
        meaning: 'grasp',
        updatedAt: new Date('2026-05-06T12:00:00.000Z'),
      },
    ]);

    await db.insert(cardGroups).values([
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-due',
        groupId: 'group-core',
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-new',
        groupId: 'group-core',
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-active',
        groupId: 'group-core',
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-snoozed',
        groupId: 'group-core',
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-disabled',
        groupId: 'group-core',
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-pinned',
        groupId: 'group-extended',
      },
    ]);

    await upsertTranslationDrillDrawPile(TEST_USER.userId, TEST_LANG.languageId, 'group-core', { pileSizeLimit: 4 }, db);
    await upsertTranslationDrillDrawPile(TEST_USER.userId, TEST_LANG.languageId, 'group-extended', { pileSizeLimit: 2 }, db);

    await db.insert(translationDrillContext).values([
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-active',
        state: 'active',
        addedFrom: 'draw_pile:group-core',
        addedAt: new Date('2026-05-08T12:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-snoozed',
        state: 'snoozed',
        stateUntil: new Date('2026-05-11T12:00:00.000Z'),
        addedFrom: 'draw_pile:group-core',
        addedAt: new Date('2026-05-08T12:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-disabled',
        state: 'disabled',
        addedFrom: 'draw_pile:group-core',
        addedAt: new Date('2026-05-08T12:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-pinned',
        state: 'active',
        addedFrom: 'pinned_from_review',
        addedAt: new Date('2026-05-09T12:00:00.000Z'),
      },
    ]);

    await db.insert(translationDrillSrs).values([
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-due',
        nextDue: Math.floor(new Date('2026-05-09T12:00:00.000Z').getTime() / 1_000),
        intervalDays: 2,
        usageCount: 2,
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-active',
        nextDue: Math.floor(new Date('2026-05-12T12:00:00.000Z').getTime() / 1_000),
        intervalDays: 5,
        usageCount: 1,
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-pinned',
        nextDue: Math.floor(new Date('2026-05-13T12:00:00.000Z').getTime() / 1_000),
        intervalDays: 3,
        usageCount: 4,
      },
    ]);
  }

  it('loads configured draw piles, grouped context cards, and active challenge inputs', async () => {
    await seedLibrary();

    const [drawPiles, contextCards, challengeCards] = await Promise.all([
      listTranslationDrillDrawPileGroups(TEST_USER.userId, TEST_LANG.languageId, { now: NOW }, db),
      listTranslationDrillContextCards(TEST_USER.userId, TEST_LANG.languageId, db),
      listTranslationDrillChallengeCards(TEST_USER.userId, TEST_LANG.languageId, db),
    ]);

    expect(drawPiles).toEqual([
      expect.objectContaining({
        groupId: 'group-core',
        pileSizeLimit: 4,
        remainingCardCount: 2,
      }),
      expect.objectContaining({
        groupId: 'group-extended',
        pileSizeLimit: 2,
        remainingCardCount: 0,
      }),
    ]);
    expect(drawPiles[0]?.activeCards.map((card) => card.cardId)).toEqual(['card-active']);
    expect(drawPiles[0]?.snoozedCards.map((card) => card.cardId)).toEqual(['card-snoozed']);
    expect(contextCards.find((card) => card.cardId === 'card-pinned')?.sourceGroup).toBeNull();
    expect(challengeCards.map((card) => card.cardId)).toEqual(['card-pinned', 'card-active']);
  });

  it('draws the next eligible card from a configured pile and can pin cards from Card Review', async () => {
    await seedLibrary();

    const drawn = await drawTranslationDrillCard(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'group-core',
      { occurredAt: NOW },
      db,
    );
    await pinCardToTranslationDrillsContext(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'card-new',
      { occurredAt: NOW },
      db,
    );

    const allContextCards = await listTranslationDrillContextCards(TEST_USER.userId, TEST_LANG.languageId, db);
    const [dailyStats] = await db
      .select()
      .from(translationDrillDailyStats)
      .where(eq(translationDrillDailyStats.date, '2026-05-10'));

    expect(drawn.cardId).toBe('card-new');
    expect(drawn.sourceGroup).toEqual({ groupId: 'group-core', groupName: 'Core' });
    expect(allContextCards.find((card) => card.cardId === 'card-new')?.addedFrom).toBe('pinned_from_review');
    expect(dailyStats?.cardsDrawn).toBe(1);
  });

  it('draws from a configured pile inside an existing transaction', async () => {
    await seedLibrary();

    const drawn = await db.transaction(async (tx) => drawTranslationDrillCard(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'group-core',
      { occurredAt: NOW },
      tx,
    ));
    const [dailyStats] = await db
      .select()
      .from(translationDrillDailyStats)
      .where(eq(translationDrillDailyStats.date, '2026-05-10'));

    expect(drawn.cardId).toBe('card-new');
    expect(dailyStats?.cardsDrawn).toBe(1);
  });

  it('records selected challenge cards as used', async () => {
    await seedLibrary();

    await recordTranslationDrillChallengeUsage(
      TEST_USER.userId,
      TEST_LANG.languageId,
      ['card-active', 'card-pinned'],
      { occurredAt: NOW },
      db,
    );

    const contextCards = await listTranslationDrillContextCards(TEST_USER.userId, TEST_LANG.languageId, db);
    const storedUsageRows = await db
      .select({
        cardId: translationDrillContext.cardId,
        lastUsed: translationDrillContext.lastUsed,
      })
      .from(translationDrillContext)
      .where(eq(translationDrillContext.userId, TEST_USER.userId));

    expect(contextCards).toEqual(expect.arrayContaining([
      expect.objectContaining({
        cardId: 'card-active',
        usageCount: 2,
        lastUsedAt: NOW,
      }),
      expect.objectContaining({
        cardId: 'card-pinned',
        usageCount: 5,
        lastUsedAt: NOW,
      }),
    ]));
    expect(storedUsageRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        cardId: 'card-active',
        lastUsed: NOW,
      }),
      expect.objectContaining({
        cardId: 'card-pinned',
        lastUsed: NOW,
      }),
    ]));
  });

  it('updates snooze, dismiss, and disable state without touching core card status', async () => {
    await seedLibrary();

    await snoozeTranslationDrillCard(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'card-active',
      new Date('2026-05-11T12:00:00.000Z'),
      { occurredAt: NOW },
      db,
    );

    const dismissSchedule = await getTranslationDrillDismissSchedule(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'card-snoozed',
      db,
    );

    const dismissed = await dismissTranslationDrillCard(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'card-snoozed',
      new Date(`2026-05-${String(10 + dismissSchedule.recommendedDays).padStart(2, '0')}T12:00:00.000Z`),
      { occurredAt: NOW },
      db,
    );
    const disabled = await disableTranslationDrillCard(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'card-active',
      db,
    );

    const [storedSrs] = await db
      .select()
      .from(translationDrillSrs)
      .where(eq(translationDrillSrs.cardId, 'card-snoozed'));
    const [storedContext] = await db
      .select()
      .from(translationDrillContext)
      .where(eq(translationDrillContext.cardId, 'card-active'));
    const [storedCard] = await db
      .select()
      .from(cards)
      .where(eq(cards.cardId, 'card-active'));
    const [dailyStats] = await db
      .select()
      .from(translationDrillDailyStats)
      .where(eq(translationDrillDailyStats.date, '2026-05-10'));

    expect(dismissSchedule.optionDays).toEqual([1, 5, 15, 30]);
    expect(dismissed.state).toBe('dismissed');
    expect(disabled.state).toBe('disabled');
    expect(storedSrs).toMatchObject({
      intervalDays: 5,
      usageCount: 1,
    });
    expect(storedContext.state).toBe('disabled');
    expect(storedCard.status).toBe('active');
    expect(dailyStats).toMatchObject({
      cardsSnoozed: 1,
      cardsDismissed: 1,
    });
  });
});
