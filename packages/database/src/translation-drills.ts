import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { db, type TransactionCapableDatabaseConnection } from './index.js';
import {
  cards,
  cardGroups,
  groups,
  translationDrillContext,
  translationDrillDailyStats,
  translationDrillDrawPiles,
  translationDrillSrs,
} from './schema.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = PgDatabase<any, any, any>;

export type TranslationDrillContextState = 'active' | 'snoozed' | 'dismissed' | 'disabled';

type TranslationDrillContextRow = {
  cardId: string;
  content: string;
  meaning: string | null;
  cardType: string | null;
  partOfSpeech: string | null;
  examples: unknown;
  mnemonics: unknown;
  llmInstructions: string | null;
  updatedAt: Date | null;
  addedFrom: string | null;
  addedAt: Date | null;
  lastUsedAt: Date | null;
  contextUsageCount: number | null;
  state: string | null;
  stateUntil: Date | null;
  cefrOverride: string | null;
  metadata: unknown;
  nextDue: number | null;
  intervalDays: number | null;
  srsUsageCount: number | null;
  performanceScore: number | null;
  srsLastUsed: number | null;
};

type TranslationDrillCandidateRow = {
  cardId: string;
  updatedAt: Date | null;
  state: string | null;
  nextDue: number | null;
};

export type TranslationDrillContextCard = {
  cardId: string;
  content: string;
  meaning: string | null;
  cardType: string | null;
  partOfSpeech: string | null;
  examples: string[];
  mnemonics: string[];
  llmInstructions: string | null;
  updatedAt: Date | null;
  sourceGroup: { groupId: string; groupName: string } | null;
  addedFrom: string | null;
  addedAt: Date | null;
  lastUsedAt: Date | null;
  usageCount: number;
  state: TranslationDrillContextState;
  stateUntil: Date | null;
  cefrOverride: string | null;
  metadata: unknown;
  nextDueAt: Date | null;
  intervalDays: number | null;
  performanceScore: number | null;
};

export type TranslationDrillDrawPileGroup = {
  groupId: string;
  groupName: string;
  drawPileName: string | null;
  pileSizeLimit: number;
  remainingCardCount: number;
  activeCards: TranslationDrillContextCard[];
  snoozedCards: TranslationDrillContextCard[];
};

export type TranslationDrillPosPile = {
  pos: string;
  remainingCardCount: number;
  activeCards: TranslationDrillContextCard[];
  snoozedCards: TranslationDrillContextCard[];
};

export type TranslationDrillDismissSchedule = {
  cardId: string;
  recommendedDays: number;
  optionDays: number[];
};

export type TranslationDrillMutationResult = {
  cardId: string;
  state: TranslationDrillContextState;
  stateUntil: Date | null;
  nextDueAt: Date | null;
  intervalDays: number | null;
  usageCount: number;
  performanceScore: number | null;
};

type TranslationDrillDailyStatIncrements = {
  cardsDrawn?: number;
  cardsSnoozed?: number;
  cardsDismissed?: number;
};

function getConn(database?: AnyDb) {
  return database ?? (db as AnyDb);
}

function normalizeGroupIds(groupIds?: string[] | null): string[] {
  return [...new Set((groupIds ?? []).map((groupId) => groupId.trim()).filter(Boolean))];
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

function getContextState(value: string | null | undefined): TranslationDrillContextState {
  if (value === 'snoozed' || value === 'dismissed' || value === 'disabled') {
    return value;
  }

  return 'active';
}

function parseDrawPileSourceGroupId(addedFrom: string | null | undefined): string | null {
  if (!addedFrom?.startsWith('draw_pile:')) {
    return null;
  }

  const groupId = addedFrom.slice('draw_pile:'.length).trim();
  return groupId.length > 0 ? groupId : null;
}

export function parseDrawPilePosSource(addedFrom: string | null | undefined): string | null {
  if (!addedFrom?.startsWith('draw_pile_pos:')) {
    return null;
  }

  const pos = addedFrom.slice('draw_pile_pos:'.length).trim();
  return pos.length > 0 ? pos : null;
}

async function runInTransaction<T>(database: AnyDb | undefined, callback: (tx: AnyDb) => Promise<T>): Promise<T> {
  const connection = getConn(database);

  if ('transaction' in connection && typeof connection.transaction === 'function') {
    return await (connection as TransactionCapableDatabaseConnection).transaction(async (tx: AnyDb) => callback(tx));
  }

  return await callback(connection);
}

async function upsertDailyStats(
  userId: string,
  languageId: string,
  occurredAt: Date,
  increments: TranslationDrillDailyStatIncrements,
  database?: AnyDb,
): Promise<void> {
  const statsDate = toStatsDate(occurredAt);

  await getConn(database)
    .insert(translationDrillDailyStats)
    .values({
      userId,
      languageId,
      date: statsDate,
      cardsDrawn: increments.cardsDrawn ?? 0,
      cardsSnoozed: increments.cardsSnoozed ?? 0,
      cardsDismissed: increments.cardsDismissed ?? 0,
    })
    .onConflictDoUpdate({
      target: [
        translationDrillDailyStats.userId,
        translationDrillDailyStats.languageId,
        translationDrillDailyStats.date,
      ],
      set: {
        cardsDrawn: sql`${translationDrillDailyStats.cardsDrawn} + ${increments.cardsDrawn ?? 0}`,
        cardsSnoozed: sql`${translationDrillDailyStats.cardsSnoozed} + ${increments.cardsSnoozed ?? 0}`,
        cardsDismissed: sql`${translationDrillDailyStats.cardsDismissed} + ${increments.cardsDismissed ?? 0}`,
      },
    });
}

async function activateTranslationDrillCardInConnection(
  userId: string,
  languageId: string,
  cardId: string,
  connection: AnyDb,
  options: {
    addedFrom?: string | null;
    occurredAt?: Date;
    trackDrawStat?: boolean;
  } = {},
): Promise<TranslationDrillContextCard> {
  const occurredAt = options.occurredAt ?? new Date();
  const [card] = await connection
    .select({
      cardId: cards.cardId,
    })
    .from(cards)
    .where(and(
      eq(cards.userId, userId),
      eq(cards.languageId, languageId),
      eq(cards.cardId, cardId),
      eq(cards.status, 'active'),
    ));

  if (!card) {
    throw new Error('That card is not available for Translation Drills.');
  }

  await connection
    .insert(translationDrillContext)
    .values({
      userId,
      languageId,
      cardId,
      state: 'active',
      addedFrom: options.addedFrom ?? null,
      addedAt: occurredAt,
      lastUsed: null,
      usageCount: 0,
      stateUntil: null,
    })
    .onConflictDoUpdate({
      target: [
        translationDrillContext.userId,
        translationDrillContext.languageId,
        translationDrillContext.cardId,
      ],
      set: {
        state: 'active',
        addedFrom: options.addedFrom ?? translationDrillContext.addedFrom,
        addedAt: occurredAt,
        stateUntil: null,
      },
    });

  if (options.trackDrawStat) {
    await upsertDailyStats(userId, languageId, occurredAt, { cardsDrawn: 1 }, connection);
  }

  return await requireContextCard(userId, languageId, cardId, connection);
}

async function getConfiguredDrawPile(
  userId: string,
  languageId: string,
  groupId: string,
  database?: AnyDb,
) {
  const [row] = await getConn(database)
    .select({
      groupId: translationDrillDrawPiles.groupId,
      enabled: translationDrillDrawPiles.enabled,
      drawPileName: translationDrillDrawPiles.drawPileName,
      pileSizeLimit: translationDrillDrawPiles.pileSizeLimit,
      groupName: groups.groupName,
    })
    .from(translationDrillDrawPiles)
    .innerJoin(groups, and(
      eq(groups.userId, translationDrillDrawPiles.userId),
      eq(groups.languageId, translationDrillDrawPiles.languageId),
      eq(groups.groupId, translationDrillDrawPiles.groupId),
    ))
    .where(and(
      eq(translationDrillDrawPiles.userId, userId),
      eq(translationDrillDrawPiles.languageId, languageId),
      eq(translationDrillDrawPiles.groupId, groupId),
      eq(translationDrillDrawPiles.enabled, true),
    ));

  return row ?? null;
}

async function loadDrawPileGroupRows(
  userId: string,
  languageId: string,
  database?: AnyDb,
) {
  return await getConn(database)
    .select({
      groupId: translationDrillDrawPiles.groupId,
      groupName: groups.groupName,
      drawPileName: translationDrillDrawPiles.drawPileName,
      pileSizeLimit: translationDrillDrawPiles.pileSizeLimit,
    })
    .from(translationDrillDrawPiles)
    .innerJoin(groups, and(
      eq(groups.userId, translationDrillDrawPiles.userId),
      eq(groups.languageId, translationDrillDrawPiles.languageId),
      eq(groups.groupId, translationDrillDrawPiles.groupId),
    ))
    .where(and(
      eq(translationDrillDrawPiles.userId, userId),
      eq(translationDrillDrawPiles.languageId, languageId),
      eq(translationDrillDrawPiles.enabled, true),
    ))
    .orderBy(asc(groups.groupName));
}

async function loadContextRows(
  userId: string,
  languageId: string,
  database?: AnyDb,
  cardIds?: string[],
): Promise<TranslationDrillContextRow[]> {
  const normalizedCardIds = normalizeGroupIds(cardIds);

  if (cardIds && normalizedCardIds.length === 0) {
    return [];
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
      addedFrom: translationDrillContext.addedFrom,
      addedAt: translationDrillContext.addedAt,
      lastUsedAt: translationDrillContext.lastUsed,
      contextUsageCount: translationDrillContext.usageCount,
      state: translationDrillContext.state,
      stateUntil: translationDrillContext.stateUntil,
      cefrOverride: translationDrillContext.cefrOverride,
      metadata: translationDrillContext.metadata,
      nextDue: translationDrillSrs.nextDue,
      intervalDays: translationDrillSrs.intervalDays,
      srsUsageCount: translationDrillSrs.usageCount,
      performanceScore: translationDrillSrs.performanceScore,
      srsLastUsed: translationDrillSrs.lastUsed,
    })
    .from(translationDrillContext)
    .innerJoin(cards, and(
      eq(cards.userId, translationDrillContext.userId),
      eq(cards.languageId, translationDrillContext.languageId),
      eq(cards.cardId, translationDrillContext.cardId),
      eq(cards.status, 'active'),
    ))
    .leftJoin(translationDrillSrs, and(
      eq(translationDrillSrs.userId, translationDrillContext.userId),
      eq(translationDrillSrs.languageId, translationDrillContext.languageId),
      eq(translationDrillSrs.cardId, translationDrillContext.cardId),
    ))
    .where(and(
      eq(translationDrillContext.userId, userId),
      eq(translationDrillContext.languageId, languageId),
      ...(normalizedCardIds.length > 0 ? [inArray(translationDrillContext.cardId, normalizedCardIds)] : []),
    ))
    .orderBy(
      sql`COALESCE(${translationDrillContext.lastUsed}, to_timestamp(${translationDrillSrs.lastUsed})) ASC NULLS FIRST`,
      sql`GREATEST(COALESCE(${translationDrillContext.usageCount}, 0), COALESCE(${translationDrillSrs.usageCount}, 0))`,
      desc(cards.updatedAt),
    );
}

async function loadAvailableDrawCandidates(
  userId: string,
  languageId: string,
  groupId: string,
  database?: AnyDb,
): Promise<TranslationDrillCandidateRow[]> {
  return await getConn(database)
    .select({
      cardId: cards.cardId,
      updatedAt: cards.updatedAt,
      state: translationDrillContext.state,
      nextDue: translationDrillSrs.nextDue,
    })
    .from(cardGroups)
    .innerJoin(cards, and(
      eq(cards.userId, cardGroups.userId),
      eq(cards.languageId, cardGroups.languageId),
      eq(cards.cardId, cardGroups.cardId),
      eq(cards.status, 'active'),
    ))
    .leftJoin(translationDrillContext, and(
      eq(translationDrillContext.userId, cardGroups.userId),
      eq(translationDrillContext.languageId, cardGroups.languageId),
      eq(translationDrillContext.cardId, cardGroups.cardId),
    ))
    .leftJoin(translationDrillSrs, and(
      eq(translationDrillSrs.userId, cardGroups.userId),
      eq(translationDrillSrs.languageId, cardGroups.languageId),
      eq(translationDrillSrs.cardId, cardGroups.cardId),
    ))
    .where(and(
      eq(cardGroups.userId, userId),
      eq(cardGroups.languageId, languageId),
      eq(cardGroups.groupId, groupId),
    ))
    .orderBy(
      asc(sql<number>`COALESCE(${translationDrillSrs.nextDue}, 0)`),
      desc(cards.updatedAt),
    );
}

async function loadAvailablePosPileCandidates(
  userId: string,
  languageId: string,
  pos: string,
  database?: AnyDb,
): Promise<TranslationDrillCandidateRow[]> {
  return await getConn(database)
    .select({
      cardId: cards.cardId,
      updatedAt: cards.updatedAt,
      state: translationDrillContext.state,
      nextDue: translationDrillSrs.nextDue,
    })
    .from(cards)
    .leftJoin(translationDrillContext, and(
      eq(translationDrillContext.userId, cards.userId),
      eq(translationDrillContext.languageId, cards.languageId),
      eq(translationDrillContext.cardId, cards.cardId),
    ))
    .leftJoin(translationDrillSrs, and(
      eq(translationDrillSrs.userId, cards.userId),
      eq(translationDrillSrs.languageId, cards.languageId),
      eq(translationDrillSrs.cardId, cards.cardId),
    ))
    .where(and(
      eq(cards.userId, userId),
      eq(cards.languageId, languageId),
      eq(cards.status, 'active'),
      eq(cards.cardType, 'word'),
      eq(cards.partOfSpeech, pos),
    ))
    .orderBy(
      asc(sql<number>`COALESCE(${translationDrillSrs.nextDue}, 0)`),
      desc(cards.updatedAt),
    );
}

async function countAvailablePosPileCandidates(
  userId: string,
  languageId: string,
  pos: string,
  now: Date,
  database?: AnyDb,
): Promise<number> {
  const nowSeconds = toUnixSeconds(now);
  const rows = await loadAvailablePosPileCandidates(userId, languageId, pos, database);

  return rows.filter((row) => {
    if (row.state === null || row.state === undefined) {
      return true;
    }

    const state = getContextState(row.state);

    if (state === 'dismissed') {
      return row.nextDue === null || row.nextDue <= nowSeconds;
    }

    return false;
  }).length;
}

async function countAvailableCardsForGroup(
  userId: string,
  languageId: string,
  groupId: string,
  now: Date,
  database?: AnyDb,
): Promise<number> {
  const nowSeconds = toUnixSeconds(now);
  const rows = await loadAvailableDrawCandidates(userId, languageId, groupId, database);

  return rows.filter((row) => {
    const state = getContextState(row.state);

    if (row.state === null || row.state === undefined) {
      return true;
    }

    if (state === 'dismissed') {
      return row.nextDue === null || row.nextDue <= nowSeconds;
    }

    return false;
  }).length;
}

function buildGroupLookup(groupRows: Array<{ groupId: string; groupName: string }>) {
  return new Map(groupRows.map((group) => [group.groupId, group.groupName]));
}

function getEffectiveUsageCount(contextUsageCount: number | null, srsUsageCount: number | null): number {
  return Math.max(contextUsageCount ?? 0, srsUsageCount ?? 0);
}

function mapContextCard(
  row: TranslationDrillContextRow,
  groupLookup: Map<string, string>,
): TranslationDrillContextCard {
  const sourceGroupId = parseDrawPileSourceGroupId(row.addedFrom);
  const usageCount = getEffectiveUsageCount(row.contextUsageCount, row.srsUsageCount);

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
    sourceGroup: sourceGroupId
      ? {
          groupId: sourceGroupId,
          groupName: groupLookup.get(sourceGroupId) ?? sourceGroupId,
        }
      : null,
    addedFrom: row.addedFrom,
    addedAt: row.addedAt,
    lastUsedAt: row.lastUsedAt ?? fromUnixSeconds(row.srsLastUsed),
    usageCount,
    state: getContextState(row.state),
    stateUntil: row.stateUntil,
    cefrOverride: row.cefrOverride,
    metadata: row.metadata,
    nextDueAt: fromUnixSeconds(row.nextDue),
    intervalDays: row.intervalDays,
    performanceScore: row.performanceScore,
  };
}

async function requireContextCard(
  userId: string,
  languageId: string,
  cardId: string,
  database?: AnyDb,
): Promise<TranslationDrillContextCard> {
  const groupRows = await loadDrawPileGroupRows(userId, languageId, database);
  const groupLookup = buildGroupLookup(groupRows.map((group) => ({ groupId: group.groupId, groupName: group.groupName })));
  const rows = await loadContextRows(userId, languageId, database, [cardId]);
  const row = rows[0];

  if (!row) {
    throw new Error('That card is not in the Translation Drills context.');
  }

  return mapContextCard(row, groupLookup);
}

export async function upsertTranslationDrillDrawPile(
  userId: string,
  languageId: string,
  groupId: string,
  options: {
    enabled?: boolean;
    drawPileName?: string | null;
    pileSizeLimit?: number | null;
  } = {},
  database?: AnyDb,
) {
  const [group] = await getConn(database)
    .select({
      groupId: groups.groupId,
      groupName: groups.groupName,
    })
    .from(groups)
    .where(and(
      eq(groups.userId, userId),
      eq(groups.languageId, languageId),
      eq(groups.groupId, groupId),
    ));

  if (!group) {
    throw new Error('That group is not available for Translation Drills.');
  }

  await getConn(database)
    .insert(translationDrillDrawPiles)
    .values({
      userId,
      languageId,
      groupId,
      enabled: options.enabled ?? true,
      drawPileName: options.drawPileName ?? null,
      pileSizeLimit: options.pileSizeLimit ?? 10,
    })
    .onConflictDoUpdate({
      target: [
        translationDrillDrawPiles.userId,
        translationDrillDrawPiles.languageId,
        translationDrillDrawPiles.groupId,
      ],
      set: {
        enabled: options.enabled ?? true,
        drawPileName: options.drawPileName ?? null,
        pileSizeLimit: options.pileSizeLimit ?? 10,
      },
    });

  return {
    groupId: group.groupId,
    groupName: group.groupName,
    enabled: options.enabled ?? true,
    drawPileName: options.drawPileName ?? null,
    pileSizeLimit: options.pileSizeLimit ?? 10,
  };
}

export async function listTranslationDrillContextCards(
  userId: string,
  languageId: string,
  database?: AnyDb,
): Promise<TranslationDrillContextCard[]> {
  const [groupRows, contextRows] = await Promise.all([
    loadDrawPileGroupRows(userId, languageId, database),
    loadContextRows(userId, languageId, database),
  ]);
  const groupLookup = buildGroupLookup(groupRows.map((group) => ({ groupId: group.groupId, groupName: group.groupName })));

  return contextRows.map((row) => mapContextCard(row, groupLookup));
}

export async function listTranslationDrillChallengeCards(
  userId: string,
  languageId: string,
  database?: AnyDb,
): Promise<TranslationDrillContextCard[]> {
  const cardsInContext = await listTranslationDrillContextCards(userId, languageId, database);

  return cardsInContext.filter((card) => card.state === 'active');
}

export async function listTranslationDrillDrawPileGroups(
  userId: string,
  languageId: string,
  options: { now?: Date } = {},
  database?: AnyDb,
): Promise<TranslationDrillDrawPileGroup[]> {
  const now = options.now ?? new Date();
  const groupRows = await loadDrawPileGroupRows(userId, languageId, database);
  const groupLookup = buildGroupLookup(groupRows.map((group) => ({ groupId: group.groupId, groupName: group.groupName })));
  const contextCards = await listTranslationDrillContextCards(userId, languageId, database);

  const cardsByGroup = new Map<string, { active: TranslationDrillContextCard[]; snoozed: TranslationDrillContextCard[] }>();

  for (const card of contextCards) {
    const groupId = card.sourceGroup?.groupId;

    if (!groupId) {
      continue;
    }

    const bucket = cardsByGroup.get(groupId) ?? { active: [], snoozed: [] };

    if (card.state === 'active') {
      bucket.active.push(card);
    } else if (card.state === 'snoozed') {
      bucket.snoozed.push(card);
    }

    cardsByGroup.set(groupId, bucket);
  }

  const remainingCounts = await Promise.all(groupRows.map(async (group) => ({
    groupId: group.groupId,
    remainingCardCount: await countAvailableCardsForGroup(userId, languageId, group.groupId, now, database),
  })));
  const remainingByGroup = new Map(remainingCounts.map((entry) => [entry.groupId, entry.remainingCardCount]));

  return groupRows.map((group) => {
    const groupedCards = cardsByGroup.get(group.groupId) ?? { active: [], snoozed: [] };

    return {
      groupId: group.groupId,
      groupName: groupLookup.get(group.groupId) ?? group.groupName,
      drawPileName: group.drawPileName,
      pileSizeLimit: group.pileSizeLimit ?? 10,
      remainingCardCount: remainingByGroup.get(group.groupId) ?? 0,
      activeCards: groupedCards.active,
      snoozedCards: groupedCards.snoozed,
    };
  });
}

export async function listAvailablePosPiles(
  userId: string,
  languageId: string,
  options: { now?: Date } = {},
  database?: AnyDb,
): Promise<TranslationDrillPosPile[]> {
  const now = options.now ?? new Date();
  const contextCards = await listTranslationDrillContextCards(userId, languageId, database);

  const cardsByPos = new Map<string, { active: TranslationDrillContextCard[]; snoozed: TranslationDrillContextCard[] }>();

  for (const card of contextCards) {
    const pos = parseDrawPilePosSource(card.addedFrom);

    if (!pos) {
      continue;
    }

    const bucket = cardsByPos.get(pos) ?? { active: [], snoozed: [] };

    if (card.state === 'active') {
      bucket.active.push(card);
    } else if (card.state === 'snoozed') {
      bucket.snoozed.push(card);
    }

    cardsByPos.set(pos, bucket);
  }

  const remainingCountEntries = await Promise.all(
    [...cardsByPos.keys()].map(async (pos) => ({
      pos,
      remainingCardCount: await countAvailablePosPileCandidates(userId, languageId, pos, now, database),
    })),
  );

  // Also collect POS values with drawable candidates not yet in context
  const allPosInCards = await getConn(database)
    .selectDistinct({ partOfSpeech: cards.partOfSpeech })
    .from(cards)
    .where(and(
      eq(cards.userId, userId),
      eq(cards.languageId, languageId),
      eq(cards.status, 'active'),
      eq(cards.cardType, 'word'),
    ));

  const candidatePosValues = allPosInCards
    .map((row) => row.partOfSpeech)
    .filter((pos): pos is string => typeof pos === 'string' && pos.trim().length > 0);

  const newPosValues = candidatePosValues.filter((pos) => !cardsByPos.has(pos));
  const newPosCounts = await Promise.all(
    newPosValues.map(async (pos) => ({
      pos,
      remainingCardCount: await countAvailablePosPileCandidates(userId, languageId, pos, now, database),
    })),
  );

  const allRemainingByPos = new Map([
    ...remainingCountEntries.map((entry) => [entry.pos, entry.remainingCardCount] as const),
    ...newPosCounts.map((entry) => [entry.pos, entry.remainingCardCount] as const),
  ]);

  const allPosPiles: TranslationDrillPosPile[] = [];

  for (const [pos, counts] of allRemainingByPos) {
    const contextBucket = cardsByPos.get(pos) ?? { active: [], snoozed: [] };
    const hasContextCards = contextBucket.active.length > 0 || contextBucket.snoozed.length > 0;
    const remainingCardCount = counts;

    if (!hasContextCards && remainingCardCount === 0) {
      continue;
    }

    allPosPiles.push({
      pos,
      remainingCardCount,
      activeCards: contextBucket.active,
      snoozedCards: contextBucket.snoozed,
    });
  }

  return allPosPiles.sort((a, b) => a.pos.localeCompare(b.pos));
}

export async function getTranslationDrillDismissSchedule(
  userId: string,
  languageId: string,
  cardId: string,
  database?: AnyDb,
): Promise<TranslationDrillDismissSchedule> {
  await requireContextCard(userId, languageId, cardId, database);

  const [row] = await getConn(database)
    .select({
      intervalDays: translationDrillSrs.intervalDays,
    })
    .from(translationDrillSrs)
    .where(and(
      eq(translationDrillSrs.userId, userId),
      eq(translationDrillSrs.languageId, languageId),
      eq(translationDrillSrs.cardId, cardId),
    ));

  const baseInterval = Math.max(row?.intervalDays ?? 1, 1);
  const recommendedDays = Math.min(60, Math.max(5, Math.round(baseInterval * 2)));
  const optionDays = [...new Set([
    1,
    recommendedDays,
    Math.min(60, Math.max(14, Math.round(recommendedDays * 3))),
    Math.min(90, Math.max(30, Math.round(recommendedDays * 6))),
  ])].sort((left, right) => left - right);

  return {
    cardId,
    recommendedDays,
    optionDays,
  };
}

export async function activateTranslationDrillCard(
  userId: string,
  languageId: string,
  cardId: string,
  options: {
    addedFrom?: string | null;
    occurredAt?: Date;
    trackDrawStat?: boolean;
  } = {},
  database?: AnyDb,
): Promise<TranslationDrillContextCard> {
  return await runInTransaction(database, async (tx) => {
    return await activateTranslationDrillCardInConnection(
      userId,
      languageId,
      cardId,
      tx,
      options,
    );
  });
}

export async function pinCardToTranslationDrillsContext(
  userId: string,
  languageId: string,
  cardId: string,
  options: { occurredAt?: Date } = {},
  database?: AnyDb,
): Promise<TranslationDrillContextCard> {
  return await activateTranslationDrillCard(
    userId,
    languageId,
    cardId,
    {
      addedFrom: 'pinned_from_review',
      occurredAt: options.occurredAt,
      trackDrawStat: false,
    },
    database,
  );
}

export async function drawTranslationDrillCard(
  userId: string,
  languageId: string,
  groupId: string,
  options: { occurredAt?: Date } = {},
  database?: AnyDb,
): Promise<TranslationDrillContextCard> {
  const occurredAt = options.occurredAt ?? new Date();
  const nowSeconds = toUnixSeconds(occurredAt);

  return await runInTransaction(database, async (tx) => {
    const drawPile = await getConfiguredDrawPile(userId, languageId, groupId, tx);

    if (!drawPile) {
      throw new Error('That group is not configured as a Translation Drills draw pile.');
    }

    const contextCards = await listTranslationDrillContextCards(userId, languageId, tx);
    const currentGroupCards = contextCards.filter((card) =>
      card.sourceGroup?.groupId === groupId && (card.state === 'active' || card.state === 'snoozed'));

    if (currentGroupCards.length >= (drawPile.pileSizeLimit ?? 10)) {
      throw new Error('That draw pile is already at its active limit.');
    }

    const candidates = await loadAvailableDrawCandidates(userId, languageId, groupId, tx);
    const nextCard = candidates.find((candidate) => {
      if (candidate.state === null) {
        return true;
      }

      const state = getContextState(candidate.state);

      if (state !== 'dismissed') {
        return false;
      }

      return candidate.nextDue === null || candidate.nextDue <= nowSeconds;
    });

    if (!nextCard) {
      throw new Error('There are no cards available to draw from that pile right now.');
    }

    return await activateTranslationDrillCardInConnection(
      userId,
      languageId,
      nextCard.cardId,
      tx,
      {
        addedFrom: `draw_pile:${groupId}`,
        occurredAt,
        trackDrawStat: true,
      },
    );
  });
}

export async function drawTranslationDrillPosCard(
  userId: string,
  languageId: string,
  pos: string,
  options: { occurredAt?: Date } = {},
  database?: AnyDb,
): Promise<TranslationDrillContextCard> {
  const occurredAt = options.occurredAt ?? new Date();
  const nowSeconds = toUnixSeconds(occurredAt);

  return await runInTransaction(database, async (tx) => {
    const candidates = await loadAvailablePosPileCandidates(userId, languageId, pos, tx);
    const nextCard = candidates.find((candidate) => {
      if (candidate.state === null) {
        return true;
      }

      const state = getContextState(candidate.state);

      if (state !== 'dismissed') {
        return false;
      }

      return candidate.nextDue === null || candidate.nextDue <= nowSeconds;
    });

    if (!nextCard) {
      throw new Error('There are no cards available to draw from that POS pile right now.');
    }

    return await activateTranslationDrillCardInConnection(
      userId,
      languageId,
      nextCard.cardId,
      tx,
      {
        addedFrom: `draw_pile_pos:${pos}`,
        occurredAt,
        trackDrawStat: true,
      },
    );
  });
}

export async function snoozeTranslationDrillCard(
  userId: string,
  languageId: string,
  cardId: string,
  snoozedUntil: Date,
  options: { occurredAt?: Date } = {},
  database?: AnyDb,
): Promise<TranslationDrillMutationResult> {
  const occurredAt = options.occurredAt ?? new Date();
  const existing = await requireContextCard(userId, languageId, cardId, database);

  if (existing.state !== 'active') {
    throw new Error('That card is not active in Translation Drills.');
  }

  return await runInTransaction(database, async (tx) => {
    await tx
      .update(translationDrillContext)
      .set({
        state: 'snoozed',
        stateUntil: snoozedUntil,
      })
      .where(and(
        eq(translationDrillContext.userId, userId),
        eq(translationDrillContext.languageId, languageId),
        eq(translationDrillContext.cardId, cardId),
      ));

    await upsertDailyStats(userId, languageId, occurredAt, { cardsSnoozed: 1 }, tx);
    const updated = await requireContextCard(userId, languageId, cardId, tx);

    return {
      cardId,
      state: updated.state,
      stateUntil: updated.stateUntil,
      nextDueAt: updated.nextDueAt,
      intervalDays: updated.intervalDays,
      usageCount: updated.usageCount,
      performanceScore: updated.performanceScore,
    };
  });
}

export async function disableTranslationDrillCard(
  userId: string,
  languageId: string,
  cardId: string,
  database?: AnyDb,
): Promise<TranslationDrillMutationResult> {
  await requireContextCard(userId, languageId, cardId, database);

  return await runInTransaction(database, async (tx) => {
    await tx
      .update(translationDrillContext)
      .set({
        state: 'disabled',
        stateUntil: null,
      })
      .where(and(
        eq(translationDrillContext.userId, userId),
        eq(translationDrillContext.languageId, languageId),
        eq(translationDrillContext.cardId, cardId),
      ));

    const updated = await requireContextCard(userId, languageId, cardId, tx);

    return {
      cardId,
      state: updated.state,
      stateUntil: updated.stateUntil,
      nextDueAt: updated.nextDueAt,
      intervalDays: updated.intervalDays,
      usageCount: updated.usageCount,
      performanceScore: updated.performanceScore,
    };
  });
}

export async function recordTranslationDrillChallengeUsage(
  userId: string,
  languageId: string,
  cardIds: readonly string[],
  options: { occurredAt?: Date } = {},
  database?: AnyDb,
): Promise<void> {
  const normalizedCardIds = [...new Set(cardIds.map((cardId) => cardId.trim()).filter(Boolean))];

  if (normalizedCardIds.length === 0) {
    return;
  }

  const occurredAt = options.occurredAt ?? new Date();

  await runInTransaction(database, async (tx) => {
    const contextCards = await Promise.all(normalizedCardIds.map(async (cardId) => requireContextCard(userId, languageId, cardId, tx)));

    if (contextCards.some((card) => card.state !== 'active')) {
      throw new Error('Only active Translation Drills cards can be recorded for challenge usage.');
    }

    for (const card of contextCards) {
      await tx
        .update(translationDrillContext)
        .set({
          lastUsed: occurredAt,
          usageCount: card.usageCount + 1,
        })
        .where(and(
          eq(translationDrillContext.userId, userId),
          eq(translationDrillContext.languageId, languageId),
          eq(translationDrillContext.cardId, card.cardId),
        ));
    }
  });
}

export async function dismissTranslationDrillCard(
  userId: string,
  languageId: string,
  cardId: string,
  returnAt: Date,
  options: {
    occurredAt?: Date;
    performanceScore?: number | null;
  } = {},
  database?: AnyDb,
): Promise<TranslationDrillMutationResult> {
  const occurredAt = options.occurredAt ?? new Date();
  const existing = await requireContextCard(userId, languageId, cardId, database);

  if (existing.state !== 'active' && existing.state !== 'snoozed') {
    throw new Error('That card cannot be dismissed from Translation Drills right now.');
  }

  return await runInTransaction(database, async (tx) => {
    const intervalDays = Math.max(1, Math.round((returnAt.getTime() - occurredAt.getTime()) / 86_400_000));
    const nextDue = toUnixSeconds(returnAt);
    const previousUsageCount = existing.usageCount;

    await tx
      .insert(translationDrillSrs)
      .values({
        userId,
        languageId,
        cardId,
        nextDue,
        intervalDays,
        usageCount: previousUsageCount + 1,
        lastUsed: toUnixSeconds(occurredAt),
        performanceScore: options.performanceScore ?? existing.performanceScore ?? null,
      })
      .onConflictDoUpdate({
        target: [
          translationDrillSrs.userId,
          translationDrillSrs.languageId,
          translationDrillSrs.cardId,
        ],
        set: {
          nextDue,
          intervalDays,
          usageCount: previousUsageCount + 1,
          lastUsed: toUnixSeconds(occurredAt),
          performanceScore: options.performanceScore ?? existing.performanceScore ?? null,
        },
      });

    await tx
      .update(translationDrillContext)
      .set({
        state: 'dismissed',
        stateUntil: returnAt,
        lastUsed: occurredAt,
        usageCount: previousUsageCount + 1,
      })
      .where(and(
        eq(translationDrillContext.userId, userId),
        eq(translationDrillContext.languageId, languageId),
        eq(translationDrillContext.cardId, cardId),
      ));

    await upsertDailyStats(userId, languageId, occurredAt, { cardsDismissed: 1 }, tx);
    const updated = await requireContextCard(userId, languageId, cardId, tx);

    return {
      cardId,
      state: updated.state,
      stateUntil: updated.stateUntil,
      nextDueAt: updated.nextDueAt,
      intervalDays: updated.intervalDays,
      usageCount: updated.usageCount,
      performanceScore: updated.performanceScore,
    };
  });
}
