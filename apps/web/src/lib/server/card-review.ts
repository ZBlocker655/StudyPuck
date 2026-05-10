import {
  getActiveUserLanguages,
  getCardReviewHomeStats,
  getDb,
  listCardReviewGroupSummaries,
  listCardReviewSessionCards,
  type CardReviewGroupSummary,
  type CardReviewHomeStats,
  type CardReviewQueueItem,
} from '@studypuck/database';
import { z } from 'zod';
import { activeGroupIdSchema } from '$lib/schemas/cards.js';

type DatabaseClient = ReturnType<typeof getDb>;

export type CardReviewLoaderDeps = {
  getActiveUserLanguages: typeof getActiveUserLanguages;
  getCardReviewHomeStats: typeof getCardReviewHomeStats;
  listCardReviewGroupSummaries: typeof listCardReviewGroupSummaries;
  listCardReviewSessionCards: typeof listCardReviewSessionCards;
};

const defaultLoaderDeps: CardReviewLoaderDeps = {
  getActiveUserLanguages,
  getCardReviewHomeStats,
  listCardReviewGroupSummaries,
  listCardReviewSessionCards,
};

const cardReviewSessionLimitSchema = z.coerce.number().int().min(1, 'Session size must be at least 1 card.').max(100, 'Session size must be 100 cards or fewer.');

export class CardReviewRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'CardReviewRequestError';
    this.status = status;
  }
}

export type CardReviewSessionSelection = {
  groupIds: string[];
  limit: number | null;
  countMode: 'all_due' | 'limit';
};

export type CardReviewGroupSummaryData = {
  groupId: string;
  groupName: string;
  activeCardCount: number;
  dueCardCount: number;
  nextDueAtIso: string | null;
};

export type CardReviewHomeData = {
  stats: {
    cardsInRotation: number;
    dueNowCount: number;
    reviewedTodayCount: number;
    currentStreakDays: number;
    lastReviewedAtIso: string | null;
  };
  groups: CardReviewGroupSummaryData[];
  selection: CardReviewSessionSelection;
  sessionPreview: {
    selectedGroupCount: number;
    selectedDueCount: number;
    nextDueAtIso: string | null;
  };
};

export type CardReviewSessionItemData = {
  cardId: string;
  content: string;
  meaning: string | null;
  cardType: string | null;
  examples: string[];
  mnemonics: string[];
  llmInstructions: string | null;
  updatedAtIso: string | null;
  groups: Array<{ groupId: string; groupName: string }>;
  nextDueAtIso: string | null;
  intervalDays: number;
  easeFactor: number;
  reviewCount: number;
  lastReviewedAtIso: string | null;
  state: 'active' | 'snoozed' | 'disabled';
  snoozedUntilIso: string | null;
};

export type CardReviewSessionData = {
  selection: CardReviewSessionSelection;
  totalCount: number;
  items: CardReviewSessionItemData[];
};

async function assertUserHasLanguage(
  userId: string,
  languageId: string,
  database: DatabaseClient,
  deps: Pick<CardReviewLoaderDeps, 'getActiveUserLanguages'> = defaultLoaderDeps,
): Promise<void> {
  const activeLanguages = await deps.getActiveUserLanguages(userId, database as never);
  const languageExists = activeLanguages.some((language) => language.languageId === languageId);

  if (!languageExists) {
    throw new CardReviewRequestError(404, 'That language is not available for this user.');
  }
}

function parseSessionSelection(url: URL): CardReviewSessionSelection {
  const groupIds = [...new Set(url.searchParams.getAll('group').map((groupId) => {
    const parsed = activeGroupIdSchema.safeParse(groupId);

    if (!parsed.success) {
      throw new CardReviewRequestError(400, parsed.error.issues[0]?.message ?? 'Group identifier is invalid.');
    }

    return parsed.data;
  }))];

  const rawLimit = url.searchParams.get('limit');
  const limit = rawLimit === null || rawLimit.trim().length === 0
    ? null
    : (() => {
      const parsed = cardReviewSessionLimitSchema.safeParse(rawLimit);

      if (!parsed.success) {
        throw new CardReviewRequestError(400, parsed.error.issues[0]?.message ?? 'Session size is invalid.');
      }

      return parsed.data;
    })();

  return {
    groupIds,
    limit,
    countMode: limit === null ? 'all_due' : 'limit',
  };
}

function toIsoString(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function mapHomeStats(stats: CardReviewHomeStats) {
  return {
    cardsInRotation: stats.cardsInRotation,
    dueNowCount: stats.dueNowCount,
    reviewedTodayCount: stats.reviewedTodayCount,
    currentStreakDays: stats.currentStreakDays,
    lastReviewedAtIso: toIsoString(stats.lastReviewedAt),
  };
}

function mapGroupSummary(group: CardReviewGroupSummary): CardReviewGroupSummaryData {
  return {
    groupId: group.groupId,
    groupName: group.groupName,
    activeCardCount: group.activeCardCount,
    dueCardCount: group.dueCardCount,
    nextDueAtIso: toIsoString(group.nextDueAt),
  };
}

function mapSessionItem(item: CardReviewQueueItem): CardReviewSessionItemData {
  return {
    cardId: item.cardId,
    content: item.content,
    meaning: item.meaning,
    cardType: item.cardType,
    examples: item.examples,
    mnemonics: item.mnemonics,
    llmInstructions: item.llmInstructions,
    updatedAtIso: toIsoString(item.updatedAt),
    groups: item.groups,
    nextDueAtIso: toIsoString(item.nextDueAt),
    intervalDays: item.intervalDays,
    easeFactor: item.easeFactor,
    reviewCount: item.reviewCount,
    lastReviewedAtIso: toIsoString(item.lastReviewedAt),
    state: item.state,
    snoozedUntilIso: toIsoString(item.snoozedUntil),
  };
}

function findNextDue(groups: CardReviewGroupSummary[]): string | null {
  const nextDueAt = groups.reduce<Date | null>((soonest, group) => {
    if (!group.nextDueAt) {
      return soonest;
    }

    return soonest === null || group.nextDueAt < soonest ? group.nextDueAt : soonest;
  }, null);

  return toIsoString(nextDueAt);
}

export async function loadCardReviewHomeData(
  userId: string,
  languageId: string,
  url: URL,
  database: DatabaseClient,
  deps: CardReviewLoaderDeps = defaultLoaderDeps,
): Promise<CardReviewHomeData> {
  await assertUserHasLanguage(userId, languageId, database, deps);

  const selection = parseSessionSelection(url);
  const [stats, groups] = await Promise.all([
    deps.getCardReviewHomeStats(userId, languageId, {}, database as never),
    deps.listCardReviewGroupSummaries(userId, languageId, {}, database as never),
  ]);

  const selectedGroups = selection.groupIds.length === 0
    ? []
    : groups.filter((group) => selection.groupIds.includes(group.groupId));

  return {
    stats: mapHomeStats(stats),
    groups: groups.map((group) => mapGroupSummary(group)),
    selection,
    sessionPreview: {
      selectedGroupCount: selectedGroups.length,
      selectedDueCount: selectedGroups.reduce((count, group) => count + group.dueCardCount, 0),
      nextDueAtIso: findNextDue(selectedGroups),
    },
  };
}

export async function loadCardReviewSessionData(
  userId: string,
  languageId: string,
  url: URL,
  database: DatabaseClient,
  deps: CardReviewLoaderDeps = defaultLoaderDeps,
): Promise<CardReviewSessionData> {
  await assertUserHasLanguage(userId, languageId, database, deps);

  const selection = parseSessionSelection(url);

  if (selection.groupIds.length === 0) {
    throw new CardReviewRequestError(400, 'Select at least one group before starting a review session.');
  }

  const items = await deps.listCardReviewSessionCards(userId, languageId, {
    groupIds: selection.groupIds,
    limit: selection.limit,
  }, database as never);

  return {
    selection,
    totalCount: items.length,
    items: items.map((item) => mapSessionItem(item)),
  };
}
