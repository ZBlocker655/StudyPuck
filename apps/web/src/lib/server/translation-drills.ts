import {
  disableTranslationDrillCard,
  dismissTranslationDrillCard,
  drawTranslationDrillCard,
  getActiveUserLanguages,
  getDb,
  getGroups,
  getTranslationDrillDismissSchedule,
  listTranslationDrillChallengeCards,
  listTranslationDrillContextCards,
  listTranslationDrillDrawPileGroups,
  snoozeTranslationDrillCard,
  type TranslationDrillContextCard,
  type TranslationDrillDrawPileGroup,
} from '@studypuck/database';
import { z } from 'zod';
import { activeCardIdSchema, activeGroupIdSchema } from '$lib/schemas/cards.js';

type DatabaseClient = ReturnType<typeof getDb>;

export type TranslationDrillLoaderDeps = {
  getActiveUserLanguages: typeof getActiveUserLanguages;
  getGroups: typeof getGroups;
  listTranslationDrillDrawPileGroups: typeof listTranslationDrillDrawPileGroups;
  listTranslationDrillContextCards: typeof listTranslationDrillContextCards;
  listTranslationDrillChallengeCards: typeof listTranslationDrillChallengeCards;
  getTranslationDrillDismissSchedule: typeof getTranslationDrillDismissSchedule;
};

export type TranslationDrillActionDeps = Pick<TranslationDrillLoaderDeps, 'getActiveUserLanguages' | 'listTranslationDrillChallengeCards'> & {
  drawTranslationDrillCard: typeof drawTranslationDrillCard;
  snoozeTranslationDrillCard: typeof snoozeTranslationDrillCard;
  disableTranslationDrillCard: typeof disableTranslationDrillCard;
  dismissTranslationDrillCard: typeof dismissTranslationDrillCard;
  getTranslationDrillDismissSchedule: typeof getTranslationDrillDismissSchedule;
  now: () => Date;
};

const defaultLoaderDeps: TranslationDrillLoaderDeps = {
  getActiveUserLanguages,
  getGroups,
  listTranslationDrillDrawPileGroups,
  listTranslationDrillContextCards,
  listTranslationDrillChallengeCards,
  getTranslationDrillDismissSchedule,
};

const defaultActionDeps: TranslationDrillActionDeps = {
  getActiveUserLanguages,
  listTranslationDrillChallengeCards,
  drawTranslationDrillCard,
  snoozeTranslationDrillCard,
  disableTranslationDrillCard,
  dismissTranslationDrillCard,
  getTranslationDrillDismissSchedule,
  now: () => new Date(),
};

const translationDrillDismissDaysSchema = z.coerce.number().int().min(1, 'Dismiss timing must be at least 1 day.').max(365, 'Dismiss timing must be 365 days or fewer.');
const translationDrillActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('draw'),
    groupId: activeGroupIdSchema,
  }),
  z.object({
    action: z.literal('snooze'),
    cardId: activeCardIdSchema,
  }),
  z.object({
    action: z.literal('disable'),
    cardId: activeCardIdSchema,
  }),
  z.object({
    action: z.literal('dismiss'),
    cardId: activeCardIdSchema,
    returnInDays: translationDrillDismissDaysSchema.optional(),
  }),
  z.object({
    action: z.literal('challenge-start'),
    sourceCardIds: z.array(activeCardIdSchema).min(1).max(10).optional(),
  }),
  z.object({
    action: z.literal('challenge-clear'),
  }),
]);

const TRANSLATION_DRILL_DEFAULT_SNOOZE_DURATION_MS = 24 * 60 * 60 * 1_000;

export class TranslationDrillRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'TranslationDrillRequestError';
    this.status = status;
  }
}

export type TranslationDrillContextCardData = {
  cardId: string;
  content: string;
  meaning: string | null;
  cardType: string | null;
  examples: string[];
  mnemonics: string[];
  llmInstructions: string | null;
  updatedAtIso: string | null;
  sourceGroup: { groupId: string; groupName: string } | null;
  addedFrom: string | null;
  addedAtIso: string | null;
  lastUsedAtIso: string | null;
  usageCount: number;
  state: 'active' | 'snoozed' | 'dismissed' | 'disabled';
  stateUntilIso: string | null;
  cefrOverride: string | null;
  nextDueAtIso: string | null;
  intervalDays: number | null;
  performanceScore: number | null;
  dismissSchedule: TranslationDrillDismissScheduleData | null;
};

export type TranslationDrillDismissScheduleData = {
  recommendedDays: number;
  optionDays: number[];
};

export type TranslationDrillDrawPileGroupData = {
  groupId: string;
  groupName: string;
  drawPileName: string | null;
  pileSizeLimit: number;
  remainingCardCount: number;
  activeCards: TranslationDrillContextCardData[];
  snoozedCards: TranslationDrillContextCardData[];
};

export type TranslationDrillHomeData = {
  summary: {
    configuredGroupCount: number;
    activeCardCount: number;
    snoozedCardCount: number;
    dismissedCardCount: number;
    disabledCardCount: number;
    remainingDrawCount: number;
    hasConfiguredDrawPiles: boolean;
    hasVisibleContext: boolean;
  };
  availableGroups: Array<{ groupId: string; groupName: string }>;
  configuredGroups: TranslationDrillDrawPileGroupData[];
  ungroupedContextCards: TranslationDrillContextCardData[];
  challenge: {
    activeChallenge: null;
    generationInput: {
      activeCardCount: number;
      cefrLevel: string | null;
      cards: TranslationDrillContextCardData[];
      suggestedSourceCardIds: string[];
    };
  };
};

export type TranslationDrillActionInput = z.infer<typeof translationDrillActionSchema>;

export type TranslationDrillActionResult =
  | {
      action: 'draw';
      card: TranslationDrillContextCardData;
      message: string;
    }
  | {
      action: 'snooze' | 'disable' | 'dismiss';
      cardId: string;
      state: 'active' | 'snoozed' | 'dismissed' | 'disabled';
      stateUntilIso: string | null;
      nextDueAtIso: string | null;
      intervalDays: number | null;
      usageCount: number;
      performanceScore: number | null;
      message: string;
    }
  | {
      action: 'challenge-start';
      challenge: {
        challengeId: string;
        prompt: string;
        sourceCardIds: string[];
        startedAtIso: string;
      };
      conversationReset: true;
      message: string;
    }
  | {
      action: 'challenge-clear';
      challenge: null;
      conversationReset: true;
      message: string;
    };

type ActiveLanguageRecord = Awaited<ReturnType<typeof getActiveUserLanguages>>[number];

async function assertUserHasLanguage(
  userId: string,
  languageId: string,
  database: DatabaseClient,
  deps: Pick<TranslationDrillLoaderDeps, 'getActiveUserLanguages'> = defaultLoaderDeps,
): Promise<ActiveLanguageRecord> {
  const activeLanguages = await deps.getActiveUserLanguages(userId, database as never);
  const language = activeLanguages.find((entry) => entry.languageId === languageId);

  if (!language) {
    throw new TranslationDrillRequestError(404, 'That language is not available for this user.');
  }

  return language;
}

function toIsoString(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function mapContextCard(
  card: TranslationDrillContextCard,
  dismissSchedules: ReadonlyMap<string, TranslationDrillDismissScheduleData> = new Map(),
): TranslationDrillContextCardData {
  return {
    cardId: card.cardId,
    content: card.content,
    meaning: card.meaning,
    cardType: card.cardType,
    examples: card.examples,
    mnemonics: card.mnemonics,
    llmInstructions: card.llmInstructions,
    updatedAtIso: toIsoString(card.updatedAt),
    sourceGroup: card.sourceGroup,
    addedFrom: card.addedFrom,
    addedAtIso: toIsoString(card.addedAt),
    lastUsedAtIso: toIsoString(card.lastUsedAt),
    usageCount: card.usageCount,
    state: card.state,
    stateUntilIso: toIsoString(card.stateUntil),
    cefrOverride: card.cefrOverride,
    nextDueAtIso: toIsoString(card.nextDueAt),
    intervalDays: card.intervalDays,
    performanceScore: card.performanceScore,
    dismissSchedule: dismissSchedules.get(card.cardId) ?? null,
  };
}

function mapDrawPileGroup(
  group: TranslationDrillDrawPileGroup,
  dismissSchedules: ReadonlyMap<string, TranslationDrillDismissScheduleData> = new Map(),
): TranslationDrillDrawPileGroupData {
  return {
    groupId: group.groupId,
    groupName: group.groupName,
    drawPileName: group.drawPileName,
    pileSizeLimit: group.pileSizeLimit,
    remainingCardCount: group.remainingCardCount,
    activeCards: group.activeCards.map((card) => mapContextCard(card, dismissSchedules)),
    snoozedCards: group.snoozedCards.map((card) => mapContextCard(card, dismissSchedules)),
  };
}

function buildActionMessage(action: TranslationDrillActionInput['action']): string {
  switch (action) {
    case 'draw':
      return 'Card drawn into Translation Drills.';
    case 'snooze':
      return 'Card snoozed.';
    case 'disable':
      return 'Card disabled.';
    case 'dismiss':
      return 'Card dismissed from the active context.';
    case 'challenge-start':
      return 'New challenge ready.';
    case 'challenge-clear':
      return 'Challenge cleared.';
  }
}

function normalizeMutationError(error: unknown): never {
  if (error instanceof TranslationDrillRequestError) {
    throw error;
  }

  if (error instanceof Error) {
    if (
      error.message === 'That card is not in the Translation Drills context.' ||
      error.message === 'That card is not active in Translation Drills.' ||
      error.message === 'That card cannot be dismissed from Translation Drills right now.' ||
      error.message === 'That group is not configured as a Translation Drills draw pile.' ||
      error.message === 'There are no cards available to draw from that pile right now.'
    ) {
      throw new TranslationDrillRequestError(404, error.message);
    }

    if (
      error.message === 'That draw pile is already at its active limit.' ||
      error.message === 'That card is not available for Translation Drills.'
    ) {
      throw new TranslationDrillRequestError(400, error.message);
    }
  }

  throw error;
}

async function validateChallengeSourceCards(
  userId: string,
  languageId: string,
  sourceCardIds: string[],
  database: DatabaseClient,
  deps: Pick<TranslationDrillActionDeps, 'listTranslationDrillChallengeCards'> = defaultActionDeps,
): Promise<void> {
  const activeCards = await deps.listTranslationDrillChallengeCards(userId, languageId, database as never);
  const activeCardIds = new Set(activeCards.map((card) => card.cardId));

  for (const cardId of sourceCardIds) {
    if (!activeCardIds.has(cardId)) {
      throw new TranslationDrillRequestError(400, 'Challenge source cards must come from the active Translation Drills context.');
    }
  }
}

function formatChallengeMeaning(card: TranslationDrillContextCard) {
  return card.meaning?.replace(/^to\s+/i, '') ?? `use "${card.content}"`;
}

function buildChallengePrompt(cards: TranslationDrillContextCard[]) {
  const [firstCard, secondCard] = cards;

  if (!firstCard) {
    throw new TranslationDrillRequestError(400, 'Draw or pin at least one active card before starting a challenge.');
  }

  const firstMeaning = formatChallengeMeaning(firstCard);
  const secondMeaning = secondCard ? formatChallengeMeaning(secondCard) : null;

  return secondMeaning
    ? `We should ${firstMeaning} this carefully before we ${secondMeaning}.`
    : `I want to ${firstMeaning} this more clearly today.`;
}

export async function loadTranslationDrillHomeData(
  userId: string,
  languageId: string,
  database: DatabaseClient,
  deps: TranslationDrillLoaderDeps = defaultLoaderDeps,
): Promise<TranslationDrillHomeData> {
  const language = await assertUserHasLanguage(userId, languageId, database, deps);

  const [availableGroups, configuredGroups, contextCards, challengeCards] = await Promise.all([
    deps.getGroups(userId, languageId, database as never),
    deps.listTranslationDrillDrawPileGroups(userId, languageId, {}, database as never),
    deps.listTranslationDrillContextCards(userId, languageId, database as never),
    deps.listTranslationDrillChallengeCards(userId, languageId, database as never),
  ]);

  const configuredGroupIds = new Set(configuredGroups.map((group) => group.groupId));
  const visibleContextCards = contextCards.filter((card) => card.state === 'active' || card.state === 'snoozed');
  const dismissScheduleEntries = await Promise.all(
    visibleContextCards.map(async (card) => {
      const schedule = await deps.getTranslationDrillDismissSchedule(userId, languageId, card.cardId, database as never);

      return [
        card.cardId,
        {
          recommendedDays: schedule.recommendedDays,
          optionDays: schedule.optionDays,
        } satisfies TranslationDrillDismissScheduleData,
      ] as const;
    }),
  );
  const dismissSchedules = new Map(dismissScheduleEntries);
  const ungroupedContextCards = contextCards
    .filter((card) => card.state === 'active' || card.state === 'snoozed')
    .filter((card) => !card.sourceGroup || !configuredGroupIds.has(card.sourceGroup.groupId));

  return {
    summary: {
      configuredGroupCount: configuredGroups.length,
      activeCardCount: contextCards.filter((card) => card.state === 'active').length,
      snoozedCardCount: contextCards.filter((card) => card.state === 'snoozed').length,
      dismissedCardCount: contextCards.filter((card) => card.state === 'dismissed').length,
      disabledCardCount: contextCards.filter((card) => card.state === 'disabled').length,
      remainingDrawCount: configuredGroups.reduce((total, group) => total + group.remainingCardCount, 0),
      hasConfiguredDrawPiles: configuredGroups.length > 0,
      hasVisibleContext: contextCards.some((card) => card.state === 'active' || card.state === 'snoozed'),
    },
    availableGroups: [...availableGroups]
      .map((group) => ({ groupId: group.groupId, groupName: group.groupName }))
      .sort((left, right) => left.groupName.localeCompare(right.groupName)),
    configuredGroups: configuredGroups.map((group) => mapDrawPileGroup(group, dismissSchedules)),
    ungroupedContextCards: ungroupedContextCards.map((card) => mapContextCard(card, dismissSchedules)),
    challenge: {
      activeChallenge: null,
      generationInput: {
        activeCardCount: challengeCards.length,
        cefrLevel: language.cefrLevel ?? null,
        cards: challengeCards.map((card) => mapContextCard(card, dismissSchedules)),
        suggestedSourceCardIds: challengeCards.slice(0, 2).map((card) => card.cardId),
      },
    },
  };
}

export async function applyTranslationDrillAction(
  userId: string,
  languageId: string,
  input: unknown,
  database: DatabaseClient,
  deps: TranslationDrillActionDeps = defaultActionDeps,
): Promise<TranslationDrillActionResult> {
  await assertUserHasLanguage(userId, languageId, database, deps);

  const parsed = translationDrillActionSchema.safeParse(input);

  if (!parsed.success) {
    throw new TranslationDrillRequestError(400, parsed.error.issues[0]?.message ?? 'Translation Drills action is invalid.');
  }

  const payload = parsed.data;

  try {
    switch (payload.action) {
      case 'draw': {
        const drawnCard = await deps.drawTranslationDrillCard(
          userId,
          languageId,
          payload.groupId,
          { occurredAt: deps.now() },
          database as never,
        );
        const schedule = await deps.getTranslationDrillDismissSchedule(userId, languageId, drawnCard.cardId, database as never);

        return {
          action: 'draw',
          card: mapContextCard(drawnCard, new Map([[
            drawnCard.cardId,
            {
              recommendedDays: schedule.recommendedDays,
              optionDays: schedule.optionDays,
            },
          ]])),
          message: buildActionMessage('draw'),
        };
      }

      case 'snooze': {
        const occurredAt = deps.now();
        const result = await deps.snoozeTranslationDrillCard(
          userId,
          languageId,
          payload.cardId,
          new Date(occurredAt.getTime() + TRANSLATION_DRILL_DEFAULT_SNOOZE_DURATION_MS),
          { occurredAt },
          database as never,
        );

        return {
          action: 'snooze',
          cardId: result.cardId,
          state: result.state,
          stateUntilIso: toIsoString(result.stateUntil),
          nextDueAtIso: toIsoString(result.nextDueAt),
          intervalDays: result.intervalDays,
          usageCount: result.usageCount,
          performanceScore: result.performanceScore,
          message: buildActionMessage('snooze'),
        };
      }

      case 'disable': {
        const result = await deps.disableTranslationDrillCard(
          userId,
          languageId,
          payload.cardId,
          database as never,
        );

        return {
          action: 'disable',
          cardId: result.cardId,
          state: result.state,
          stateUntilIso: toIsoString(result.stateUntil),
          nextDueAtIso: toIsoString(result.nextDueAt),
          intervalDays: result.intervalDays,
          usageCount: result.usageCount,
          performanceScore: result.performanceScore,
          message: buildActionMessage('disable'),
        };
      }

      case 'dismiss': {
        const schedule = await deps.getTranslationDrillDismissSchedule(
          userId,
          languageId,
          payload.cardId,
          database as never,
        );
        const occurredAt = deps.now();
        const returnInDays = payload.returnInDays ?? schedule.recommendedDays;
        const result = await deps.dismissTranslationDrillCard(
          userId,
          languageId,
          payload.cardId,
          new Date(occurredAt.getTime() + (returnInDays * 86_400_000)),
          { occurredAt },
          database as never,
        );

        return {
          action: 'dismiss',
          cardId: result.cardId,
          state: result.state,
          stateUntilIso: toIsoString(result.stateUntil),
          nextDueAtIso: toIsoString(result.nextDueAt),
          intervalDays: result.intervalDays,
          usageCount: result.usageCount,
          performanceScore: result.performanceScore,
          message: buildActionMessage('dismiss'),
        };
      }

      case 'challenge-start': {
        const availableChallengeCards = await deps.listTranslationDrillChallengeCards(userId, languageId, database as never);
        const selectedSourceCardIds = payload.sourceCardIds ?? availableChallengeCards.slice(0, 2).map((card) => card.cardId);

        await validateChallengeSourceCards(userId, languageId, selectedSourceCardIds, database, deps);

        const challengeCardById = new Map(availableChallengeCards.map((card) => [card.cardId, card]));
        const sourceCards = selectedSourceCardIds
          .map((cardId) => challengeCardById.get(cardId))
          .filter((card): card is TranslationDrillContextCard => card !== undefined);
        const challengeId = `translation-drill-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;

        return {
          action: 'challenge-start',
          challenge: {
            challengeId,
            prompt: buildChallengePrompt(sourceCards),
            sourceCardIds: selectedSourceCardIds,
            startedAtIso: deps.now().toISOString(),
          },
          conversationReset: true,
          message: buildActionMessage('challenge-start'),
        };
      }

      case 'challenge-clear':
        return {
          action: 'challenge-clear',
          challenge: null,
          conversationReset: true,
          message: buildActionMessage('challenge-clear'),
        };
    }
  } catch (error) {
    normalizeMutationError(error);
  }
}
