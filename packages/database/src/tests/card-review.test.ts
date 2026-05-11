import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { setupTestDatabase, cleanupTestDatabase, resetTestTables, type TestDb } from '../test-utils.js';
import {
  cardGroups,
  cards,
  cardReviewDailyStats,
  cardReviewEvents,
  cardReviewSrs,
  groups,
  studyLanguages,
  translationDrillContext,
  users,
} from '../schema.js';
import {
  disableCardForReview,
  getCardReviewHomeStats,
  listCardReviewGroupSummaries,
  listCardReviewSessionCards,
  recordCardReviewPinToDrills,
  recordCardReviewRating,
  snoozeCardForReview,
} from '../card-review.js';

const TEST_USER = { userId: 'auth0|card-review-user', email: 'card-review@example.com' };
const TEST_LANG = { userId: TEST_USER.userId, languageId: 'zh', languageName: 'Chinese' };
const NOW = new Date('2026-05-10T12:00:00.000Z');

describe('Card Review database operations', () => {
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

  async function seedReviewLibrary() {
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
        cardType: 'word',
        meaning: 'to compensate',
        examples: ['我们以后再补偿这次错过的时间。'],
        updatedAt: new Date('2026-05-01T12:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-new',
        content: '巩固',
        status: 'active',
        cardType: 'word',
        meaning: 'to consolidate',
        mnemonics: ['solid core'],
        updatedAt: new Date('2026-05-02T12:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-future',
        content: '逐渐',
        status: 'active',
        cardType: 'pattern',
        meaning: 'gradually',
        updatedAt: new Date('2026-05-03T12:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-snoozed',
        content: '搁置',
        status: 'active',
        cardType: 'word',
        meaning: 'to set aside',
        updatedAt: new Date('2026-05-04T12:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-disabled',
        content: '停用',
        status: 'active',
        cardType: 'word',
        meaning: 'to disable',
        updatedAt: new Date('2026-05-05T12:00:00.000Z'),
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
        cardId: 'card-future',
        groupId: 'group-extended',
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-snoozed',
        groupId: 'group-extended',
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-disabled',
        groupId: 'group-extended',
      },
    ]);

    await db.insert(cardReviewSrs).values([
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-due',
        nextDue: Math.floor(new Date('2026-05-09T12:00:00.000Z').getTime() / 1_000),
        intervalDays: 2,
        easeFactor: 2.5,
        reviewCount: 1,
        lastReviewed: Math.floor(new Date('2026-05-07T12:00:00.000Z').getTime() / 1_000),
        state: 'active',
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-future',
        nextDue: Math.floor(new Date('2026-05-12T12:00:00.000Z').getTime() / 1_000),
        intervalDays: 4,
        easeFactor: 2.6,
        reviewCount: 2,
        lastReviewed: Math.floor(new Date('2026-05-08T12:00:00.000Z').getTime() / 1_000),
        state: 'active',
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-snoozed',
        nextDue: Math.floor(new Date('2026-05-09T08:00:00.000Z').getTime() / 1_000),
        intervalDays: 1,
        easeFactor: 2.3,
        reviewCount: 3,
        lastReviewed: Math.floor(new Date('2026-05-08T08:00:00.000Z').getTime() / 1_000),
        state: 'snoozed',
        snoozedUntil: new Date('2026-05-11T12:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-disabled',
        nextDue: Math.floor(new Date('2026-05-09T10:00:00.000Z').getTime() / 1_000),
        intervalDays: 2,
        easeFactor: 2.1,
        reviewCount: 4,
        lastReviewed: Math.floor(new Date('2026-05-06T10:00:00.000Z').getTime() / 1_000),
        state: 'disabled',
      },
    ]);

    await db.insert(cardReviewDailyStats).values([
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        date: '2026-05-09',
        cardsReviewed: 4,
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        date: '2026-05-08',
        cardsReviewed: 2,
      },
    ]);
  }

  it('computes home stats and per-group due summaries with snooze-aware upcoming dates', async () => {
    await seedReviewLibrary();

    const [stats, groups] = await Promise.all([
      getCardReviewHomeStats(TEST_USER.userId, TEST_LANG.languageId, { now: NOW }, db),
      listCardReviewGroupSummaries(TEST_USER.userId, TEST_LANG.languageId, { now: NOW }, db),
    ]);

    expect(stats).toMatchObject({
      cardsInRotation: 3,
      dueNowCount: 2,
      reviewedTodayCount: 0,
      currentStreakDays: 2,
    });
    expect(stats.lastReviewedAt?.toISOString()).toBe('2026-05-08T12:00:00.000Z');
    expect(groups).toEqual([
      {
        groupId: 'group-core',
        groupName: 'Core',
        activeCardCount: 2,
        dueCardCount: 2,
        nextDueAt: null,
      },
      {
        groupId: 'group-extended',
        groupName: 'Extended',
        activeCardCount: 1,
        dueCardCount: 0,
        nextDueAt: new Date('2026-05-11T12:00:00.000Z'),
      },
    ]);
  });

  it('builds a due-card session queue scoped to the selected groups and limit', async () => {
    await seedReviewLibrary();

    const queue = await listCardReviewSessionCards(
      TEST_USER.userId,
      TEST_LANG.languageId,
      {
        now: NOW,
        groupIds: ['group-core', 'group-extended'],
        limit: 2,
      },
      db,
    );

    expect(queue.map((item) => item.cardId)).toEqual(['card-new', 'card-due']);
    expect(queue[0]?.groups).toEqual([{ groupId: 'group-core', groupName: 'Core' }]);
    expect(queue[0]?.mnemonics).toEqual(['solid core']);
    expect(queue[1]?.nextDueAt?.toISOString()).toBe('2026-05-09T12:00:00.000Z');
  });

  it('records review ratings by updating SRS, event history, and daily stats', async () => {
    await db.insert(cards).values({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      cardId: 'card-rating',
      content: '熟悉',
      status: 'active',
      cardType: 'word',
      meaning: 'to become familiar with',
    });

    const result = await recordCardReviewRating(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'card-rating',
      'easy',
      {
        reviewedAt: NOW,
        reviewTimeMinutes: 4,
      },
      db,
    );

    const [storedSrs] = await db
      .select()
      .from(cardReviewSrs)
      .where(eq(cardReviewSrs.cardId, 'card-rating'));
    const [storedEvent] = await db
      .select()
      .from(cardReviewEvents)
      .where(eq(cardReviewEvents.eventId, result.eventId));
    const [storedStats] = await db
      .select()
      .from(cardReviewDailyStats)
      .where(eq(cardReviewDailyStats.date, '2026-05-10'));

    expect(result.intervalDays).toBe(3);
    expect(result.nextDueAt?.toISOString()).toBe('2026-05-13T12:00:00.000Z');
    expect(storedSrs).toMatchObject({
      state: 'active',
      intervalDays: 3,
      reviewCount: 1,
      nextDue: Math.floor(new Date('2026-05-13T12:00:00.000Z').getTime() / 1_000),
    });
    expect(storedEvent).toMatchObject({
      eventType: 'rated',
      rating: 'easy',
      previousState: 'active',
      nextState: 'active',
      nextIntervalDays: 3,
    });
    expect(storedStats).toMatchObject({
      cardsReviewed: 1,
      cardsRatedEasy: 1,
      totalReviewTimeMinutes: 4,
    });
  });

  it('persists snooze, disable, and pin events with daily stat counters', async () => {
    await db.insert(cards).values({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      cardId: 'card-actions',
      content: '暂缓',
      status: 'active',
      cardType: 'word',
    });
    await db.insert(cardReviewSrs).values({
      userId: TEST_USER.userId,
      languageId: TEST_LANG.languageId,
      cardId: 'card-actions',
      nextDue: Math.floor(NOW.getTime() / 1_000),
      intervalDays: 1,
      easeFactor: 2.5,
      reviewCount: 1,
      state: 'active',
    });

    await snoozeCardForReview(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'card-actions',
      new Date('2026-05-11T12:00:00.000Z'),
      { occurredAt: NOW },
      db,
    );
    await disableCardForReview(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'card-actions',
      { occurredAt: NOW },
      db,
    );
    await recordCardReviewPinToDrills(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'card-actions',
      {
        occurredAt: NOW,
        metadata: { source: 'card-review-test' },
      },
      db,
    );

    const [storedSrs] = await db
      .select()
      .from(cardReviewSrs)
      .where(eq(cardReviewSrs.cardId, 'card-actions'));
    const storedEvents = await db
      .select()
      .from(cardReviewEvents)
      .where(eq(cardReviewEvents.cardId, 'card-actions'));
    const [storedStats] = await db
      .select()
      .from(cardReviewDailyStats)
      .where(eq(cardReviewDailyStats.date, '2026-05-10'));
    const [translationContext] = await db
      .select()
      .from(translationDrillContext)
      .where(eq(translationDrillContext.cardId, 'card-actions'));

    expect(storedSrs.state).toBe('disabled');
    expect(storedEvents.map((event) => event.eventType).sort()).toEqual(['disabled', 'pinned_to_drills', 'snoozed']);
    expect(storedStats).toMatchObject({
      cardsSnoozed: 1,
      cardsDisabled: 1,
      cardsPinnedToDrills: 1,
    });
    expect(translationContext).toMatchObject({
      state: 'active',
      addedFrom: 'pinned_from_review',
    });
  });
});
