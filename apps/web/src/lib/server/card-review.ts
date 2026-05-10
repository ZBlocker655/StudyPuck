import {
  disableCardForReview,
  getActiveUserLanguages,
  getCardReviewHomeStats,
  getDb,
  getGroups,
  listCardReviewGroupSummaries,
  listCardReviewSessionCards,
  recordCardReviewPinToDrills,
  recordCardReviewRating,
  snoozeCardForReview,
  type CardReviewGroupSummary,
  type CardReviewHomeStats,
  type CardReviewQueueItem,
  type CardReviewRating,
} from '@studypuck/database';
import { z } from 'zod';
import { activeCardIdSchema, activeGroupIdSchema } from '$lib/schemas/cards.js';

type DatabaseClient = ReturnType<typeof getDb>;

export type CardReviewLoaderDeps = {
  getActiveUserLanguages: typeof getActiveUserLanguages;
  getCardReviewHomeStats: typeof getCardReviewHomeStats;
  listCardReviewGroupSummaries: typeof listCardReviewGroupSummaries;
  listCardReviewSessionCards: typeof listCardReviewSessionCards;
  getGroups: typeof getGroups;
};

export type CardReviewActionDeps = Pick<CardReviewLoaderDeps, 'getActiveUserLanguages'> & {
  recordCardReviewRating: typeof recordCardReviewRating;
  recordCardReviewPinToDrills: typeof recordCardReviewPinToDrills;
  snoozeCardForReview: typeof snoozeCardForReview;
  disableCardForReview: typeof disableCardForReview;
  now: () => Date;
};

const defaultLoaderDeps: CardReviewLoaderDeps = {
  getActiveUserLanguages,
  getCardReviewHomeStats,
  listCardReviewGroupSummaries,
  listCardReviewSessionCards,
  getGroups,
};

const defaultActionDeps: CardReviewActionDeps = {
  getActiveUserLanguages,
  recordCardReviewRating,
  recordCardReviewPinToDrills,
  snoozeCardForReview,
  disableCardForReview,
  now: () => new Date(),
};

const cardReviewSessionLimitSchema = z.coerce.number().int().min(1, 'Session size must be at least 1 card.').max(100, 'Session size must be 100 cards or fewer.');
const cardReviewRatingSchema = z.enum(['easy', 'medium', 'hard']);
const cardReviewSessionActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('rate'),
    cardId: activeCardIdSchema,
    rating: cardReviewRatingSchema,
  }),
  z.object({
    action: z.literal('pin'),
    cardId: activeCardIdSchema,
  }),
  z.object({
    action: z.literal('snooze'),
    cardId: activeCardIdSchema,
  }),
  z.object({
    action: z.literal('disable'),
    cardId: activeCardIdSchema,
  }),
]);

const CARD_REVIEW_DEFAULT_SNOOZE_DURATION_MS = 24 * 60 * 60 * 1_000;

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
  availableGroups: Array<{ groupId: string; groupName: string }>;
};

export type CardReviewSessionActionInput = z.infer<typeof cardReviewSessionActionSchema>;

export type CardReviewSessionActionResult = {
  action: CardReviewSessionActionInput['action'];
  cardId: string;
  rating: CardReviewRating | null;
  occurredAtIso: string;
  state: 'active' | 'snoozed' | 'disabled';
  snoozedUntilIso: string | null;
  nextDueAtIso: string | null;
  intervalDays: number;
  easeFactor: number;
  reviewCount: number;
  message: string;
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

function mapAvailableGroup(group: { groupId: string; groupName: string }) {
  return {
    groupId: group.groupId,
    groupName: group.groupName,
  };
}

function buildSessionActionMessage(action: CardReviewSessionActionInput['action'], rating: CardReviewRating | null): string {
  if (action === 'rate') {
    const label = rating === 'easy' ? 'Easy' : rating === 'medium' ? 'Medium' : 'Hard';
    return `${label} recorded.`;
  }

  if (action === 'pin') {
    return 'Card pinned to Translation Drills.';
  }

  if (action === 'snooze') {
    return 'Card snoozed.';
  }

  return 'Card disabled.';
}

function normalizeMutationError(error: unknown): never {
  if (error instanceof CardReviewRequestError) {
    throw error;
  }

  if (error instanceof Error && error.message === 'That card is not available for review.') {
    throw new CardReviewRequestError(404, error.message);
  }

  throw error;
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

  const [items, availableGroups] = await Promise.all([
    deps.listCardReviewSessionCards(userId, languageId, {
      groupIds: selection.groupIds,
      limit: selection.limit,
    }, database as never),
    deps.getGroups(userId, languageId, database as never),
  ]);

  return {
    selection,
    totalCount: items.length,
    items: items.map((item) => mapSessionItem(item)),
    availableGroups: [...availableGroups]
      .map((group) => mapAvailableGroup(group))
      .sort((left, right) => left.groupName.localeCompare(right.groupName)),
  };
}

export async function applyCardReviewSessionAction(
  userId: string,
  languageId: string,
  input: unknown,
  database: DatabaseClient,
  deps: CardReviewActionDeps = defaultActionDeps,
): Promise<CardReviewSessionActionResult> {
  await assertUserHasLanguage(userId, languageId, database, deps);

  const parsedInput = cardReviewSessionActionSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new CardReviewRequestError(
      400,
      parsedInput.error.issues[0]?.message ?? 'A valid Card Review action is required.',
    );
  }

  const occurredAt = deps.now();

  try {
    const result = parsedInput.data.action === 'rate'
      ? await deps.recordCardReviewRating(
        userId,
        languageId,
        parsedInput.data.cardId,
        parsedInput.data.rating,
        { reviewedAt: occurredAt },
        database as never,
      )
      : parsedInput.data.action === 'pin'
        ? await deps.recordCardReviewPinToDrills(
          userId,
          languageId,
          parsedInput.data.cardId,
          { occurredAt },
          database as never,
        )
        : parsedInput.data.action === 'snooze'
          ? await deps.snoozeCardForReview(
            userId,
            languageId,
            parsedInput.data.cardId,
            new Date(occurredAt.getTime() + CARD_REVIEW_DEFAULT_SNOOZE_DURATION_MS),
            { occurredAt },
            database as never,
          )
          : await deps.disableCardForReview(
            userId,
            languageId,
            parsedInput.data.cardId,
            { occurredAt },
            database as never,
          );

    return {
      action: parsedInput.data.action,
      cardId: result.cardId,
      rating: result.rating,
      occurredAtIso: result.occurredAt.toISOString(),
      state: result.state,
      snoozedUntilIso: toIsoString(result.snoozedUntil),
      nextDueAtIso: toIsoString(result.nextDueAt),
      intervalDays: result.intervalDays ?? 1,
      easeFactor: result.easeFactor ?? 2.5,
      reviewCount: result.reviewCount ?? 0,
      message: buildSessionActionMessage(parsedInput.data.action, result.rating),
    };
  } catch (error) {
    normalizeMutationError(error);
  }
}
