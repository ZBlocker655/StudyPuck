import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { db, type TransactionCapableDatabaseConnection } from './index.js';
import { cards, cardGroups, groups, cardReviewDailyStats, cardReviewEvents, cardReviewSrs } from './schema.js';
import { pinCardToTranslationDrillsContext } from './translation-drills.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = PgDatabase<any, any, any>;

export type CardReviewRating = 'easy' | 'medium' | 'hard';
export type CardReviewState = 'active' | 'snoozed' | 'disabled';
export type CardReviewEventType = 'rated' | 'snoozed' | 'disabled' | 'reactivated' | 'pinned_to_drills';

type ReviewCardRow = {
  cardId: string;
  content: string;
  meaning: string | null;
  cardType: string | null;
  partOfSpeech: string[] | null;
  examples: unknown;
  mnemonics: unknown;
  llmInstructions: string | null;
  updatedAt: Date | null;
  nextDue: number | null;
  intervalDays: number | null;
  easeFactor: number | null;
  reviewCount: number | null;
  lastReviewed: number | null;
  state: string | null;
  snoozedUntil: Date | null;
};

type ReviewGroupRow = {
  cardId: string;
  groupId: string;
  groupName: string;
};

type ReviewSchedule = {
  nextDue: number;
  intervalDays: number;
  easeFactor: number;
  reviewCount: number;
  lastReviewed: number;
  state: CardReviewState;
  snoozedUntil: Date | null;
};

type DailyStatIncrements = {
  cardsReviewed?: number;
  totalReviewTimeMinutes?: number;
  cardsRatedEasy?: number;
  cardsRatedMedium?: number;
  cardsRatedHard?: number;
  cardsSnoozed?: number;
  cardsDisabled?: number;
  cardsPinnedToDrills?: number;
};

export type CardReviewGroupSummary = {
  groupId: string;
  groupName: string;
  activeCardCount: number;
  dueCardCount: number;
  nextDueAt: Date | null;
};

export type CardReviewHomeStats = {
  cardsInRotation: number;
  dueNowCount: number;
  reviewedTodayCount: number;
  currentStreakDays: number;
  lastReviewedAt: Date | null;
};

export type CardReviewQueueItem = {
  cardId: string;
  content: string;
  meaning: string | null;
  cardType: string | null;
  partOfSpeech: string[] | null;
  examples: string[];
  mnemonics: string[];
  llmInstructions: string | null;
  updatedAt: Date | null;
  groups: Array<{ groupId: string; groupName: string }>;
  nextDueAt: Date | null;
  intervalDays: number;
  easeFactor: number;
  reviewCount: number;
  lastReviewedAt: Date | null;
  state: CardReviewState;
  snoozedUntil: Date | null;
};

export type CardReviewMutationResult = {
  eventId: string;
  cardId: string;
  eventType: CardReviewEventType;
  rating: CardReviewRating | null;
  occurredAt: Date;
  state: CardReviewState;
  snoozedUntil: Date | null;
  nextDueAt: Date | null;
  intervalDays: number | null;
  easeFactor: number | null;
  reviewCount: number | null;
};

function getConn(database?: AnyDb) {
  return database ?? (db as AnyDb);
}

function normalizeGroupIds(groupIds?: string[] | null): string[] {
  return [...new Set((groupIds ?? []).map((groupId) => groupId.trim()).filter(Boolean))];
}

function createEventId(): string {
  return `review-event-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1_000);
}

function fromUnixSeconds(value: number | null | undefined): Date | null {
  return typeof value === 'number' ? new Date(value * 1_000) : null;
}

function toStatsDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getStoredState(row: Pick<ReviewCardRow, 'state'>): CardReviewState {
  return (row.state === 'snoozed' || row.state === 'disabled') ? row.state : 'active';
}

function getEffectiveState(row: Pick<ReviewCardRow, 'state' | 'snoozedUntil'>, now: Date): CardReviewState {
  if (row.state === 'disabled') {
    return 'disabled';
  }

  if (row.state === 'snoozed') {
    if (row.snoozedUntil && row.snoozedUntil.getTime() <= now.getTime()) {
      return 'active';
    }

    return 'snoozed';
  }

  return 'active';
}

function isInRotation(row: Pick<ReviewCardRow, 'state' | 'snoozedUntil'>, now: Date): boolean {
  return getEffectiveState(row, now) === 'active';
}

function isDueForReview(row: Pick<ReviewCardRow, 'state' | 'snoozedUntil' | 'nextDue'>, now: Date): boolean {
  if (!isInRotation(row, now)) {
    return false;
  }

  const nowSeconds = toUnixSeconds(now);
  return row.nextDue === null || row.nextDue <= nowSeconds;
}

function getNextUpcomingDueSeconds(
  row: Pick<ReviewCardRow, 'state' | 'snoozedUntil' | 'nextDue'>,
  now: Date,
): number | null {
  if (row.state === 'disabled') {
    return null;
  }

  const nowSeconds = toUnixSeconds(now);
  const nextDue = row.nextDue;
  const snoozedUntilSeconds = row.snoozedUntil ? toUnixSeconds(row.snoozedUntil) : null;

  if (row.state === 'snoozed' && snoozedUntilSeconds !== null && snoozedUntilSeconds > nowSeconds) {
    return Math.max(nextDue ?? 0, snoozedUntilSeconds);
  }

  if (typeof nextDue !== 'number' || nextDue <= nowSeconds) {
    return null;
  }

  return nextDue;
}

function computeNextReviewSchedule(
  row: Pick<ReviewCardRow, 'intervalDays' | 'easeFactor' | 'reviewCount'> | null,
  rating: CardReviewRating,
  reviewedAt: Date,
): ReviewSchedule {
  const previousInterval = Math.max(row?.intervalDays ?? 1, 1);
  const previousEase = row?.easeFactor ?? 2.5;
  const previousReviewCount = row?.reviewCount ?? 0;

  const intervalDays = previousReviewCount === 0
    ? ({ easy: 3, medium: 2, hard: 1 } satisfies Record<CardReviewRating, number>)[rating]
    : Math.max(
      ({ easy: 3, medium: 2, hard: 1 } satisfies Record<CardReviewRating, number>)[rating],
      Math.round(previousInterval * ({ easy: 2, medium: 1.5, hard: 1 } satisfies Record<CardReviewRating, number>)[rating]),
    );

  const easeFactor = Math.min(
    3.0,
    Math.max(
      1.3,
      previousEase + ({ easy: 0.15, medium: 0, hard: -0.2 } satisfies Record<CardReviewRating, number>)[rating],
    ),
  );

  const lastReviewed = toUnixSeconds(reviewedAt);

  return {
    nextDue: lastReviewed + (intervalDays * 86_400),
    intervalDays,
    easeFactor,
    reviewCount: previousReviewCount + 1,
    lastReviewed,
    state: 'active',
    snoozedUntil: null,
  };
}

async function runInTransaction<T>(database: AnyDb | undefined, callback: (tx: AnyDb) => Promise<T>): Promise<T> {
  const connection = getConn(database);

  if ('transaction' in connection && typeof connection.transaction === 'function') {
    return await (connection as TransactionCapableDatabaseConnection).transaction(async (tx: AnyDb) => callback(tx));
  }

  return await callback(connection);
}

async function loadReviewCardRows(
  userId: string,
  languageId: string,
  database?: AnyDb,
  cardIds?: string[],
): Promise<ReviewCardRow[]> {
  const normalizedCardIds = normalizeGroupIds(cardIds);

  if (cardIds && normalizedCardIds.length === 0) {
    return [];
  }

  const conditions = [
    eq(cards.userId, userId),
    eq(cards.languageId, languageId),
    eq(cards.status, 'active'),
  ];

  if (normalizedCardIds.length > 0) {
    conditions.push(inArray(cards.cardId, normalizedCardIds));
  }

  return await getConn(database)
    .select({
      cardId: cards.cardId,
      content: cards.content,
      meaning: cards.meaning,
      cardType: cards.cardType,
      partOfSpeech: cards.partOfSpeech,
      examples: cards.examples,
      mnemonics: cards.mnemonics,
      llmInstructions: cards.llmInstructions,
      updatedAt: cards.updatedAt,
      nextDue: cardReviewSrs.nextDue,
      intervalDays: cardReviewSrs.intervalDays,
      easeFactor: cardReviewSrs.easeFactor,
      reviewCount: cardReviewSrs.reviewCount,
      lastReviewed: cardReviewSrs.lastReviewed,
      state: cardReviewSrs.state,
      snoozedUntil: cardReviewSrs.snoozedUntil,
    })
    .from(cards)
    .leftJoin(cardReviewSrs, and(
      eq(cardReviewSrs.userId, cards.userId),
      eq(cardReviewSrs.languageId, cards.languageId),
      eq(cardReviewSrs.cardId, cards.cardId),
    ))
    .where(and(...conditions))
    .orderBy(asc(sql<number>`COALESCE(${cardReviewSrs.nextDue}, 0)`), desc(cards.updatedAt));
}

async function loadReviewGroupRows(
  userId: string,
  languageId: string,
  cardIds: string[],
  database?: AnyDb,
): Promise<ReviewGroupRow[]> {
  const normalizedCardIds = normalizeGroupIds(cardIds);

  if (normalizedCardIds.length === 0) {
    return [];
  }

  return await getConn(database)
    .select({
      cardId: cardGroups.cardId,
      groupId: groups.groupId,
      groupName: groups.groupName,
    })
    .from(cardGroups)
    .innerJoin(groups, and(
      eq(groups.userId, cardGroups.userId),
      eq(groups.languageId, cardGroups.languageId),
      eq(groups.groupId, cardGroups.groupId),
    ))
    .where(and(
      eq(cardGroups.userId, userId),
      eq(cardGroups.languageId, languageId),
      inArray(cardGroups.cardId, normalizedCardIds),
    ));
}

async function loadGroups(
  userId: string,
  languageId: string,
  database?: AnyDb,
  groupIds?: string[],
) {
  const normalizedGroupIds = normalizeGroupIds(groupIds);

  if (groupIds && normalizedGroupIds.length === 0) {
    return [];
  }

  return await getConn(database)
    .select({
      groupId: groups.groupId,
      groupName: groups.groupName,
    })
    .from(groups)
    .where(and(
      eq(groups.userId, userId),
      eq(groups.languageId, languageId),
      ...(normalizedGroupIds.length > 0 ? [inArray(groups.groupId, normalizedGroupIds)] : []),
    ))
    .orderBy(asc(groups.groupName));
}

async function loadCardIdsForGroups(
  userId: string,
  languageId: string,
  groupIds: string[],
  database?: AnyDb,
): Promise<string[]> {
  const normalizedGroupIds = normalizeGroupIds(groupIds);

  if (normalizedGroupIds.length === 0) {
    return [];
  }

  const rows = await getConn(database)
    .select({ cardId: cardGroups.cardId })
    .from(cardGroups)
    .where(and(
      eq(cardGroups.userId, userId),
      eq(cardGroups.languageId, languageId),
      inArray(cardGroups.groupId, normalizedGroupIds),
    ));

  return [...new Set(rows.map((row) => row.cardId))];
}

function groupRowsByCard(rows: ReviewGroupRow[]): Map<string, Array<{ groupId: string; groupName: string }>> {
  const groupsByCardId = new Map<string, Array<{ groupId: string; groupName: string }>>();

  for (const row of rows) {
    const existing = groupsByCardId.get(row.cardId) ?? [];
    existing.push({ groupId: row.groupId, groupName: row.groupName });
    groupsByCardId.set(row.cardId, existing);
  }

  return groupsByCardId;
}

function toQueueItem(
  row: ReviewCardRow,
  groupsForCard: Array<{ groupId: string; groupName: string }>,
  now: Date,
): CardReviewQueueItem {
  return {
    cardId: row.cardId,
    content: row.content,
    meaning: row.meaning,
    cardType: row.cardType,
    partOfSpeech: row.partOfSpeech,
    examples: normalizeStringList(row.examples),
    mnemonics: normalizeStringList(row.mnemonics),
    llmInstructions: row.llmInstructions,
    updatedAt: row.updatedAt,
    groups: groupsForCard,
    nextDueAt: fromUnixSeconds(row.nextDue),
    intervalDays: Math.max(row.intervalDays ?? 1, 1),
    easeFactor: row.easeFactor ?? 2.5,
    reviewCount: Math.max(row.reviewCount ?? 0, 0),
    lastReviewedAt: fromUnixSeconds(row.lastReviewed),
    state: getEffectiveState(row, now),
    snoozedUntil: row.snoozedUntil,
  };
}

async function getReviewCardRow(
  userId: string,
  languageId: string,
  cardId: string,
  database?: AnyDb,
): Promise<ReviewCardRow | null> {
  const rows = await loadReviewCardRows(userId, languageId, database, [cardId]);
  return rows[0] ?? null;
}

async function upsertDailyStats(
  userId: string,
  languageId: string,
  occurredAt: Date,
  increments: DailyStatIncrements,
  database: AnyDb,
): Promise<void> {
  await database
    .insert(cardReviewDailyStats)
    .values({
      userId,
      languageId,
      date: toStatsDate(occurredAt),
      cardsReviewed: increments.cardsReviewed ?? 0,
      totalReviewTimeMinutes: increments.totalReviewTimeMinutes ?? 0,
      cardsRatedEasy: increments.cardsRatedEasy ?? 0,
      cardsRatedMedium: increments.cardsRatedMedium ?? 0,
      cardsRatedHard: increments.cardsRatedHard ?? 0,
      cardsSnoozed: increments.cardsSnoozed ?? 0,
      cardsDisabled: increments.cardsDisabled ?? 0,
      cardsPinnedToDrills: increments.cardsPinnedToDrills ?? 0,
    })
    .onConflictDoUpdate({
      target: [cardReviewDailyStats.userId, cardReviewDailyStats.languageId, cardReviewDailyStats.date],
      set: {
        cardsReviewed: sql`${cardReviewDailyStats.cardsReviewed} + ${increments.cardsReviewed ?? 0}`,
        totalReviewTimeMinutes: sql`${cardReviewDailyStats.totalReviewTimeMinutes} + ${increments.totalReviewTimeMinutes ?? 0}`,
        cardsRatedEasy: sql`${cardReviewDailyStats.cardsRatedEasy} + ${increments.cardsRatedEasy ?? 0}`,
        cardsRatedMedium: sql`${cardReviewDailyStats.cardsRatedMedium} + ${increments.cardsRatedMedium ?? 0}`,
        cardsRatedHard: sql`${cardReviewDailyStats.cardsRatedHard} + ${increments.cardsRatedHard ?? 0}`,
        cardsSnoozed: sql`${cardReviewDailyStats.cardsSnoozed} + ${increments.cardsSnoozed ?? 0}`,
        cardsDisabled: sql`${cardReviewDailyStats.cardsDisabled} + ${increments.cardsDisabled ?? 0}`,
        cardsPinnedToDrills: sql`${cardReviewDailyStats.cardsPinnedToDrills} + ${increments.cardsPinnedToDrills ?? 0}`,
      },
    });
}

async function insertEvent(
  userId: string,
  languageId: string,
  cardId: string,
  eventType: CardReviewEventType,
  occurredAt: Date,
  database: AnyDb,
  options: {
    rating?: CardReviewRating | null;
    previousState?: CardReviewState | null;
    nextState?: CardReviewState | null;
    previousIntervalDays?: number | null;
    nextIntervalDays?: number | null;
    previousDue?: number | null;
    nextDue?: number | null;
    metadata?: Record<string, unknown> | null;
  } = {},
): Promise<string> {
  const eventId = createEventId();

  await database.insert(cardReviewEvents).values({
    eventId,
    userId,
    languageId,
    cardId,
    eventType,
    rating: options.rating ?? null,
    previousState: options.previousState ?? null,
    nextState: options.nextState ?? null,
    previousIntervalDays: options.previousIntervalDays ?? null,
    nextIntervalDays: options.nextIntervalDays ?? null,
    previousDue: options.previousDue ?? null,
    nextDue: options.nextDue ?? null,
    occurredAt,
    metadata: options.metadata ?? null,
  });

  return eventId;
}

export async function getCardReviewHomeStats(
  userId: string,
  languageId: string,
  options: { now?: Date } = {},
  database?: AnyDb,
): Promise<CardReviewHomeStats> {
  const now = options.now ?? new Date();
  const [rows, statRows] = await Promise.all([
    loadReviewCardRows(userId, languageId, database),
    getConn(database)
      .select({
        date: cardReviewDailyStats.date,
        cardsReviewed: cardReviewDailyStats.cardsReviewed,
      })
      .from(cardReviewDailyStats)
      .where(and(
        eq(cardReviewDailyStats.userId, userId),
        eq(cardReviewDailyStats.languageId, languageId),
      ))
      .orderBy(desc(cardReviewDailyStats.date)),
  ]);

  const cardsInRotation = rows.filter((row) => isInRotation(row, now)).length;
  const dueNowCount = rows.filter((row) => isDueForReview(row, now)).length;
  const todayStats = statRows.find((row) => row.date === toStatsDate(now));

  let currentStreakDays = 0;

  if (statRows.length > 0) {
    let expectedDate = statRows[0]!.date;

    for (const row of statRows) {
      if ((row.cardsReviewed ?? 0) <= 0 || row.date !== expectedDate) {
        break;
      }

      currentStreakDays += 1;
      expectedDate = toStatsDate(new Date(new Date(`${expectedDate}T00:00:00.000Z`).getTime() - 86_400_000));
    }
  }

  const lastReviewedSeconds = rows.reduce<number | null>((latest, row) => {
    if (typeof row.lastReviewed !== 'number') {
      return latest;
    }

    return latest === null ? row.lastReviewed : Math.max(latest, row.lastReviewed);
  }, null);

  return {
    cardsInRotation,
    dueNowCount,
    reviewedTodayCount: todayStats?.cardsReviewed ?? 0,
    currentStreakDays,
    lastReviewedAt: fromUnixSeconds(lastReviewedSeconds),
  };
}

export async function listCardReviewGroupSummaries(
  userId: string,
  languageId: string,
  options: { now?: Date; groupIds?: string[] } = {},
  database?: AnyDb,
): Promise<CardReviewGroupSummary[]> {
  const now = options.now ?? new Date();
  const rows = await loadReviewCardRows(userId, languageId, database);
  const reviewGroupRows = await loadReviewGroupRows(userId, languageId, rows.map((row) => row.cardId), database);
  const availableGroups = await loadGroups(userId, languageId, database, options.groupIds);
  const groupsByCardId = groupRowsByCard(reviewGroupRows);

  const summaries = new Map<string, CardReviewGroupSummary>(
    availableGroups.map((group) => [group.groupId, {
      groupId: group.groupId,
      groupName: group.groupName,
      activeCardCount: 0,
      dueCardCount: 0,
      nextDueAt: null,
    }]),
  );

  for (const row of rows) {
    const cardGroupsForRow = groupsByCardId.get(row.cardId) ?? [];

    for (const group of cardGroupsForRow) {
      const summary = summaries.get(group.groupId);

      if (!summary) {
        continue;
      }

      if (isInRotation(row, now)) {
        summary.activeCardCount += 1;
      }

      if (isDueForReview(row, now)) {
        summary.dueCardCount += 1;
      } else {
        const nextDueSeconds = getNextUpcomingDueSeconds(row, now);

        if (nextDueSeconds !== null) {
          const nextDueAt = fromUnixSeconds(nextDueSeconds);

          if (!summary.nextDueAt || (nextDueAt && nextDueAt < summary.nextDueAt)) {
            summary.nextDueAt = nextDueAt;
          }
        }
      }
    }
  }

  return [...summaries.values()].sort((left, right) => left.groupName.localeCompare(right.groupName));
}

export async function listCardReviewSessionCards(
  userId: string,
  languageId: string,
  options: { now?: Date; groupIds?: string[] | null; limit?: number | null } = {},
  database?: AnyDb,
): Promise<CardReviewQueueItem[]> {
  const now = options.now ?? new Date();
  const normalizedGroupIds = options.groupIds === undefined || options.groupIds === null
    ? null
    : normalizeGroupIds(options.groupIds);

  if (normalizedGroupIds !== null && normalizedGroupIds.length === 0) {
    return [];
  }

  const scopedCardIds = normalizedGroupIds === null
    ? undefined
    : await loadCardIdsForGroups(userId, languageId, normalizedGroupIds, database);

  if (scopedCardIds && scopedCardIds.length === 0) {
    return [];
  }

  const rows = (await loadReviewCardRows(userId, languageId, database, scopedCardIds))
    .filter((row) => isDueForReview(row, now));
  const groupsByCardId = groupRowsByCard(await loadReviewGroupRows(userId, languageId, rows.map((row) => row.cardId), database));

  const sortedRows = rows.sort((left, right) => {
    const leftDue = left.nextDue ?? 0;
    const rightDue = right.nextDue ?? 0;

    if (leftDue !== rightDue) {
      return leftDue - rightDue;
    }

    return (right.updatedAt?.getTime() ?? 0) - (left.updatedAt?.getTime() ?? 0);
  });

  const limitedRows = typeof options.limit === 'number' ? sortedRows.slice(0, options.limit) : sortedRows;

  return limitedRows.map((row) => toQueueItem(row, groupsByCardId.get(row.cardId) ?? [], now));
}

export async function recordCardReviewRating(
  userId: string,
  languageId: string,
  cardId: string,
  rating: CardReviewRating,
  options: { reviewedAt?: Date; reviewTimeMinutes?: number } = {},
  database?: AnyDb,
): Promise<CardReviewMutationResult> {
  const reviewedAt = options.reviewedAt ?? new Date();

  return await runInTransaction(database, async (tx) => {
    const current = await getReviewCardRow(userId, languageId, cardId, tx);

    if (!current) {
      throw new Error('That card is not available for review.');
    }

    const nextSchedule = computeNextReviewSchedule(current, rating, reviewedAt);

    await tx
      .insert(cardReviewSrs)
      .values({
        userId,
        languageId,
        cardId,
        nextDue: nextSchedule.nextDue,
        intervalDays: nextSchedule.intervalDays,
        easeFactor: nextSchedule.easeFactor,
        reviewCount: nextSchedule.reviewCount,
        lastReviewed: nextSchedule.lastReviewed,
        state: nextSchedule.state,
        snoozedUntil: nextSchedule.snoozedUntil,
      })
      .onConflictDoUpdate({
        target: [cardReviewSrs.userId, cardReviewSrs.languageId, cardReviewSrs.cardId],
        set: {
          nextDue: nextSchedule.nextDue,
          intervalDays: nextSchedule.intervalDays,
          easeFactor: nextSchedule.easeFactor,
          reviewCount: nextSchedule.reviewCount,
          lastReviewed: nextSchedule.lastReviewed,
          state: nextSchedule.state,
          snoozedUntil: nextSchedule.snoozedUntil,
        },
      });

    const eventId = await insertEvent(userId, languageId, cardId, 'rated', reviewedAt, tx, {
      rating,
      previousState: getStoredState(current),
      nextState: nextSchedule.state,
      previousIntervalDays: current.intervalDays ?? 1,
      nextIntervalDays: nextSchedule.intervalDays,
      previousDue: current.nextDue,
      nextDue: nextSchedule.nextDue,
      metadata: options.reviewTimeMinutes ? { reviewTimeMinutes: options.reviewTimeMinutes } : null,
    });

    await upsertDailyStats(userId, languageId, reviewedAt, {
      cardsReviewed: 1,
      totalReviewTimeMinutes: options.reviewTimeMinutes ?? 0,
      cardsRatedEasy: rating === 'easy' ? 1 : 0,
      cardsRatedMedium: rating === 'medium' ? 1 : 0,
      cardsRatedHard: rating === 'hard' ? 1 : 0,
    }, tx);

    return {
      eventId,
      cardId,
      eventType: 'rated',
      rating,
      occurredAt: reviewedAt,
      state: nextSchedule.state,
      snoozedUntil: nextSchedule.snoozedUntil,
      nextDueAt: fromUnixSeconds(nextSchedule.nextDue),
      intervalDays: nextSchedule.intervalDays,
      easeFactor: nextSchedule.easeFactor,
      reviewCount: nextSchedule.reviewCount,
    };
  });
}

async function updateCardReviewState(
  userId: string,
  languageId: string,
  cardId: string,
  eventType: Extract<CardReviewEventType, 'snoozed' | 'disabled' | 'reactivated'>,
  options: { occurredAt?: Date; snoozedUntil?: Date | null },
  dailyStatIncrements: DailyStatIncrements,
  database?: AnyDb,
): Promise<CardReviewMutationResult> {
  const occurredAt = options.occurredAt ?? new Date();

  return await runInTransaction(database, async (tx) => {
    const current = await getReviewCardRow(userId, languageId, cardId, tx);

    if (!current) {
      throw new Error('That card is not available for review.');
    }

    const nextState = eventType === 'disabled'
      ? 'disabled'
      : eventType === 'snoozed'
        ? 'snoozed'
        : 'active';
    const nextSnoozedUntil = nextState === 'snoozed' ? (options.snoozedUntil ?? null) : null;

    await tx
      .insert(cardReviewSrs)
      .values({
        userId,
        languageId,
        cardId,
        nextDue: current.nextDue ?? 0,
        intervalDays: current.intervalDays ?? 1,
        easeFactor: current.easeFactor ?? 2.5,
        reviewCount: current.reviewCount ?? 0,
        lastReviewed: current.lastReviewed ?? null,
        state: nextState,
        snoozedUntil: nextSnoozedUntil,
      })
      .onConflictDoUpdate({
        target: [cardReviewSrs.userId, cardReviewSrs.languageId, cardReviewSrs.cardId],
        set: {
          state: nextState,
          snoozedUntil: nextSnoozedUntil,
        },
      });

    const eventId = await insertEvent(userId, languageId, cardId, eventType, occurredAt, tx, {
      previousState: getStoredState(current),
      nextState,
      previousIntervalDays: current.intervalDays,
      nextIntervalDays: current.intervalDays,
      previousDue: current.nextDue,
      nextDue: current.nextDue,
      metadata: nextSnoozedUntil ? { snoozedUntil: nextSnoozedUntil.toISOString() } : null,
    });

    await upsertDailyStats(userId, languageId, occurredAt, dailyStatIncrements, tx);

    return {
      eventId,
      cardId,
      eventType,
      rating: null,
      occurredAt,
      state: nextState,
      snoozedUntil: nextSnoozedUntil,
      nextDueAt: fromUnixSeconds(current.nextDue),
      intervalDays: current.intervalDays ?? 1,
      easeFactor: current.easeFactor ?? 2.5,
      reviewCount: current.reviewCount ?? 0,
    };
  });
}

export async function snoozeCardForReview(
  userId: string,
  languageId: string,
  cardId: string,
  snoozedUntil: Date,
  options: { occurredAt?: Date } = {},
  database?: AnyDb,
): Promise<CardReviewMutationResult> {
  return await updateCardReviewState(
    userId,
    languageId,
    cardId,
    'snoozed',
    { occurredAt: options.occurredAt, snoozedUntil },
    { cardsSnoozed: 1 },
    database,
  );
}

export async function disableCardForReview(
  userId: string,
  languageId: string,
  cardId: string,
  options: { occurredAt?: Date } = {},
  database?: AnyDb,
): Promise<CardReviewMutationResult> {
  return await updateCardReviewState(
    userId,
    languageId,
    cardId,
    'disabled',
    { occurredAt: options.occurredAt },
    { cardsDisabled: 1 },
    database,
  );
}

export async function reactivateCardForReview(
  userId: string,
  languageId: string,
  cardId: string,
  options: { occurredAt?: Date } = {},
  database?: AnyDb,
): Promise<CardReviewMutationResult> {
  return await updateCardReviewState(
    userId,
    languageId,
    cardId,
    'reactivated',
    { occurredAt: options.occurredAt },
    {},
    database,
  );
}

export async function recordCardReviewPinToDrills(
  userId: string,
  languageId: string,
  cardId: string,
  options: { occurredAt?: Date; metadata?: Record<string, unknown> | null } = {},
  database?: AnyDb,
): Promise<CardReviewMutationResult> {
  const occurredAt = options.occurredAt ?? new Date();

  return await runInTransaction(database, async (tx) => {
    const current = await getReviewCardRow(userId, languageId, cardId, tx);

    if (!current) {
      throw new Error('That card is not available for review.');
    }

    const eventId = await insertEvent(userId, languageId, cardId, 'pinned_to_drills', occurredAt, tx, {
      previousState: getStoredState(current),
      nextState: getStoredState(current),
      previousIntervalDays: current.intervalDays,
      nextIntervalDays: current.intervalDays,
      previousDue: current.nextDue,
      nextDue: current.nextDue,
      metadata: options.metadata ?? null,
    });

    await upsertDailyStats(userId, languageId, occurredAt, {
      cardsPinnedToDrills: 1,
    }, tx);
    await pinCardToTranslationDrillsContext(userId, languageId, cardId, { occurredAt }, tx);

    return {
      eventId,
      cardId,
      eventType: 'pinned_to_drills',
      rating: null,
      occurredAt,
      state: getStoredState(current),
      snoozedUntil: current.snoozedUntil,
      nextDueAt: fromUnixSeconds(current.nextDue),
      intervalDays: current.intervalDays ?? 1,
      easeFactor: current.easeFactor ?? 2.5,
      reviewCount: current.reviewCount ?? 0,
    };
  });
}
