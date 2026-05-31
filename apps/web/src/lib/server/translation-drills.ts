import {
  disableTranslationDrillCard,
  dismissTranslationDrillCard,
  drawTranslationDrillCard,
  drawTranslationDrillPosCard,
  getActiveUserLanguages,
  getDb,
  getGroups,
  recordTranslationDrillChallengeUsage,
  computeTranslationDrillDismissSchedule,
  getTranslationDrillDismissSchedule,
  listTranslationDrillChallengeCards,
  listTranslationDrillContextCards,
  listTranslationDrillDrawPileGroups,
  listAvailablePosPiles,
  snoozeTranslationDrillCard,
  type TranslationDrillContextCard,
  type TranslationDrillDrawPileGroup,
  type TranslationDrillPosPile,
} from '@studypuck/database';
import { z } from 'zod';
import { activeCardIdSchema, activeGroupIdSchema } from '$lib/schemas/cards.js';
import {
  planTranslationDrillChallenge,
  type TranslationDrillChallengePlan,
  type TranslationDrillChallengePlannerInput,
} from '$lib/server/translation-drill-challenges.js';
import { normalizeTranslationDrillDismissSchedule } from '$lib/translation-drills/dismiss-schedule.js';

type DatabaseClient = ReturnType<typeof getDb>;

export type TranslationDrillLoaderDeps = {
  getActiveUserLanguages: typeof getActiveUserLanguages;
  getGroups: typeof getGroups;
  listTranslationDrillDrawPileGroups: typeof listTranslationDrillDrawPileGroups;
  listAvailablePosPiles: typeof listAvailablePosPiles;
  listTranslationDrillContextCards: typeof listTranslationDrillContextCards;
  listTranslationDrillChallengeCards: typeof listTranslationDrillChallengeCards;
};

export type TranslationDrillActionDeps = Pick<TranslationDrillLoaderDeps, 'getActiveUserLanguages' | 'listTranslationDrillChallengeCards'> & {
  drawTranslationDrillCard: typeof drawTranslationDrillCard;
  drawTranslationDrillPosCard: typeof drawTranslationDrillPosCard;
  snoozeTranslationDrillCard: typeof snoozeTranslationDrillCard;
  disableTranslationDrillCard: typeof disableTranslationDrillCard;
  dismissTranslationDrillCard: typeof dismissTranslationDrillCard;
  recordTranslationDrillChallengeUsage: typeof recordTranslationDrillChallengeUsage;
  getTranslationDrillDismissSchedule: typeof getTranslationDrillDismissSchedule;
  now: () => Date;
};

const defaultLoaderDeps: TranslationDrillLoaderDeps = {
  getActiveUserLanguages,
  getGroups,
  listTranslationDrillDrawPileGroups,
  listAvailablePosPiles,
  listTranslationDrillContextCards,
  listTranslationDrillChallengeCards,
};

const defaultActionDeps: TranslationDrillActionDeps = {
  getActiveUserLanguages,
  listTranslationDrillChallengeCards,
  drawTranslationDrillCard,
  drawTranslationDrillPosCard,
  snoozeTranslationDrillCard,
  disableTranslationDrillCard,
  dismissTranslationDrillCard,
  recordTranslationDrillChallengeUsage,
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
    action: z.literal('draw-pos'),
    pos: z.string().min(1),
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
    sourceCardIds: z.array(activeCardIdSchema).min(1).max(2).optional(),
    previousSourceCardIds: z.array(activeCardIdSchema).min(1).max(2).optional(),
  }),
  z.object({
    action: z.literal('challenge-clear'),
  }),
]);

const TRANSLATION_DRILL_DEFAULT_SNOOZE_DURATION_MS = 24 * 60 * 60 * 1_000;
const TRANSLATION_DRILL_CHALLENGE_SHORTLIST_DIVISOR = 2;
const TRANSLATION_DRILL_CHALLENGE_SHORTLIST_MIN_SIZE = 2;

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
  partOfSpeech: string[] | null;
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

export type TranslationDrillPosPileData = {
  pos: string;
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
  posPiles: TranslationDrillPosPileData[];
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
      action: 'draw' | 'draw-pos';
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

type TranslationDrillActionRuntime = {
  privateEnv?: Record<string, string | undefined>;
  planChallenge?: (
    input: TranslationDrillChallengePlannerInput,
  ) => Promise<TranslationDrillChallengePlan>;
};

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

function toDismissScheduleData(schedule: TranslationDrillDismissScheduleData): TranslationDrillDismissScheduleData {
  return normalizeTranslationDrillDismissSchedule({ recommendedDays: schedule.recommendedDays, optionDays: schedule.optionDays });
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
    partOfSpeech: card.partOfSpeech,
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

function mapPosPile(
  pile: TranslationDrillPosPile,
  dismissSchedules: ReadonlyMap<string, TranslationDrillDismissScheduleData> = new Map(),
): TranslationDrillPosPileData {
  return {
    pos: pile.pos,
    remainingCardCount: pile.remainingCardCount,
    activeCards: pile.activeCards.map((card) => mapContextCard(card, dismissSchedules)),
    snoozedCards: pile.snoozedCards.map((card) => mapContextCard(card, dismissSchedules)),
  };
}

function buildActionMessage(action: TranslationDrillActionInput['action']): string {
  switch (action) {
    case 'draw':
    case 'draw-pos':
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

function shortlistChallengeCandidateCards(cards: TranslationDrillContextCard[]) {
  if (cards.length <= 1) {
    return cards;
  }

  const shortlistSize = Math.min(
    cards.length,
    Math.max(
      Math.floor(cards.length / TRANSLATION_DRILL_CHALLENGE_SHORTLIST_DIVISOR),
      TRANSLATION_DRILL_CHALLENGE_SHORTLIST_MIN_SIZE,
    ),
  );

  return cards.slice(0, shortlistSize);
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
      error.message === 'There are no cards available to draw from that pile right now.' ||
      error.message === 'There are no cards available to draw from that POS pile right now.'
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

function assertPlannedChallengeIsValid(
  challenge: TranslationDrillChallengePlan,
  candidateCards: readonly TranslationDrillContextCard[],
  requireExactCandidateMatch: boolean,
): void {
  const candidateCardIds = candidateCards.map((card) => card.cardId);
  const candidateCardIdSet = new Set(candidateCardIds);

  if (!challenge.prompt.trim()) {
    throw new TranslationDrillRequestError(500, 'The challenge generator returned an empty prompt.');
  }

  if (challenge.sourceCardIds.length === 0 || challenge.sourceCardIds.some((cardId) => !candidateCardIdSet.has(cardId))) {
    throw new TranslationDrillRequestError(500, 'The challenge generator returned an invalid source-card selection.');
  }

  if (
    requireExactCandidateMatch
    && (
      challenge.sourceCardIds.length !== candidateCardIds.length
      || challenge.sourceCardIds.some((cardId, index) => cardId !== candidateCardIds[index])
    )
  ) {
    throw new TranslationDrillRequestError(500, 'The challenge generator did not preserve the requested source cards.');
  }
}

export async function loadTranslationDrillHomeData(
  userId: string,
  languageId: string,
  database: DatabaseClient,
  deps: TranslationDrillLoaderDeps = defaultLoaderDeps,
): Promise<TranslationDrillHomeData> {
  const language = await assertUserHasLanguage(userId, languageId, database, deps);

  const [availableGroups, configuredGroups, posPiles, contextCards, challengeCards] = await Promise.all([
    deps.getGroups(userId, languageId, database as never),
    deps.listTranslationDrillDrawPileGroups(userId, languageId, {}, database as never),
    deps.listAvailablePosPiles(userId, languageId, {}, database as never),
    deps.listTranslationDrillContextCards(userId, languageId, database as never),
    deps.listTranslationDrillChallengeCards(userId, languageId, database as never),
  ]);

  const configuredGroupIds = new Set(configuredGroups.map((group) => group.groupId));
  const visibleContextCards = contextCards.filter((card) => card.state === 'active' || card.state === 'snoozed');
  const dismissSchedules = new Map(
    visibleContextCards.map((card) => {
      const schedule = computeTranslationDrillDismissSchedule(card.cardId, card.intervalDays);
      return [card.cardId, toDismissScheduleData(schedule)] as const;
    }),
  );
  const ungroupedContextCards = contextCards
    .filter((card) => card.state === 'active' || card.state === 'snoozed')
    .filter((card) => !card.sourceGroup || !configuredGroupIds.has(card.sourceGroup.groupId))
    .filter((card) => !card.addedFrom?.startsWith('draw_pile_pos:'));

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
    posPiles: posPiles.map((pile) => mapPosPile(pile, dismissSchedules)),
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
  runtime: TranslationDrillActionRuntime = {},
): Promise<TranslationDrillActionResult> {
  const language = await assertUserHasLanguage(userId, languageId, database, deps);

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
            toDismissScheduleData({
              recommendedDays: schedule.recommendedDays,
              optionDays: schedule.optionDays,
            }),
          ]])),
          message: buildActionMessage('draw'),
        };
      }

      case 'draw-pos': {
        const drawnCard = await deps.drawTranslationDrillPosCard(
          userId,
          languageId,
          payload.pos,
          { occurredAt: deps.now() },
          database as never,
        );
        const schedule = await deps.getTranslationDrillDismissSchedule(userId, languageId, drawnCard.cardId, database as never);

        return {
          action: 'draw-pos',
          card: mapContextCard(drawnCard, new Map([[
            drawnCard.cardId,
            toDismissScheduleData({
              recommendedDays: schedule.recommendedDays,
              optionDays: schedule.optionDays,
            }),
          ]])),
          message: buildActionMessage('draw-pos'),
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
        const occurredAt = deps.now();
        const availableChallengeCards = await deps.listTranslationDrillChallengeCards(userId, languageId, database as never);
        const challengeCardById = new Map(availableChallengeCards.map((card) => [card.cardId, card]));
        const requestedSourceCardIds = payload.sourceCardIds
          ? [...payload.sourceCardIds]
          : null;

        if (requestedSourceCardIds) {
          await validateChallengeSourceCards(userId, languageId, requestedSourceCardIds, database, deps);
        }

        const candidateCards = requestedSourceCardIds
          ? requestedSourceCardIds
            .map((cardId) => challengeCardById.get(cardId))
            .filter((card): card is TranslationDrillContextCard => card !== undefined)
          : shortlistChallengeCandidateCards(availableChallengeCards);
        const planChallenge = runtime.planChallenge ?? ((planInput: TranslationDrillChallengePlannerInput) =>
          planTranslationDrillChallenge({
            ...planInput,
            privateEnv: runtime.privateEnv ?? {},
          }));
        const plannedChallenge = await planChallenge({
          userId,
          languageId,
          targetLanguageName: language.languageName,
          cefrLevel: language.cefrLevel ?? null,
          candidateCards,
          previousSourceCardIds: payload.previousSourceCardIds,
          mustUseAllCandidateCards: Boolean(requestedSourceCardIds),
        });
        assertPlannedChallengeIsValid(plannedChallenge, candidateCards, Boolean(requestedSourceCardIds));
        await deps.recordTranslationDrillChallengeUsage(
          userId,
          languageId,
          plannedChallenge.sourceCardIds,
          { occurredAt },
          database as never,
        );
        const challengeId = `translation-drill-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;

        return {
          action: 'challenge-start',
          challenge: {
            challengeId,
            prompt: plannedChallenge.prompt,
            sourceCardIds: plannedChallenge.sourceCardIds,
            startedAtIso: occurredAt.toISOString(),
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
