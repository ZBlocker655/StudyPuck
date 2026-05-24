import { describe, expect, it, vi } from 'vitest';
import {
  applyTranslationDrillAction,
  loadTranslationDrillHomeData,
  TranslationDrillRequestError,
  type TranslationDrillActionDeps,
  type TranslationDrillLoaderDeps,
} from './translation-drills.js';

describe('Translation Drills server helpers', () => {
  const database = {} as never;

  const baseDeps = {
    getActiveUserLanguages: vi.fn(async () => [{
      userId: 'user-1',
      languageId: 'zh',
      languageName: 'Chinese',
      isActive: true,
      cefrLevel: 'B1',
      settings: null,
      createdAt: null,
    }]),
    getGroups: vi.fn(async () => [
      { groupId: 'group-extended', groupName: 'Extended' },
      { groupId: 'group-core', groupName: 'Core' },
    ]),
    listTranslationDrillDrawPileGroups: vi.fn(async () => [
      {
        groupId: 'group-core',
        groupName: 'Core',
        drawPileName: null,
        pileSizeLimit: 4,
        remainingCardCount: 2,
        activeCards: [{
          cardId: 'card-1',
          content: '补偿',
          meaning: 'to compensate',
          cardType: 'word',
          examples: [],
          mnemonics: [],
          llmInstructions: null,
          updatedAt: new Date('2026-05-01T12:00:00.000Z'),
          sourceGroup: { groupId: 'group-core', groupName: 'Core' },
          addedFrom: 'draw_pile:group-core',
          addedAt: new Date('2026-05-08T12:00:00.000Z'),
          lastUsedAt: null,
          usageCount: 0,
          state: 'active' as const,
          stateUntil: null,
          cefrOverride: null,
          metadata: null,
          nextDueAt: null,
          intervalDays: null,
          performanceScore: null,
        }],
        snoozedCards: [],
      },
    ]),
    listTranslationDrillContextCards: vi.fn(async () => [
      {
        cardId: 'card-1',
        content: '补偿',
        meaning: 'to compensate',
        cardType: 'word',
        examples: [],
        mnemonics: [],
        llmInstructions: null,
        updatedAt: new Date('2026-05-01T12:00:00.000Z'),
        sourceGroup: { groupId: 'group-core', groupName: 'Core' },
        addedFrom: 'draw_pile:group-core',
        addedAt: new Date('2026-05-08T12:00:00.000Z'),
        lastUsedAt: null,
        usageCount: 0,
        state: 'active' as const,
        stateUntil: null,
        cefrOverride: null,
        metadata: null,
        nextDueAt: null,
        intervalDays: null,
        performanceScore: null,
      },
      {
        cardId: 'card-2',
        content: '把握',
        meaning: 'to grasp',
        cardType: 'word',
        examples: [],
        mnemonics: [],
        llmInstructions: 'Prefer aspect pairs',
        updatedAt: new Date('2026-05-02T12:00:00.000Z'),
        sourceGroup: null,
        addedFrom: 'pinned_from_review',
        addedAt: new Date('2026-05-09T12:00:00.000Z'),
        lastUsedAt: new Date('2026-05-09T12:05:00.000Z'),
        usageCount: 2,
        state: 'active' as const,
        stateUntil: null,
        cefrOverride: 'B2',
        metadata: null,
        nextDueAt: new Date('2026-05-13T12:00:00.000Z'),
        intervalDays: 3,
        performanceScore: 0.8,
      },
    ]),
    listTranslationDrillChallengeCards: vi.fn(async () => [
      {
        cardId: 'card-2',
        content: '把握',
        meaning: 'to grasp',
        cardType: 'word',
        examples: [],
        mnemonics: [],
        llmInstructions: 'Prefer aspect pairs',
        updatedAt: new Date('2026-05-02T12:00:00.000Z'),
        sourceGroup: null,
        addedFrom: 'pinned_from_review',
        addedAt: new Date('2026-05-09T12:00:00.000Z'),
        lastUsedAt: new Date('2026-05-09T12:05:00.000Z'),
        usageCount: 2,
        state: 'active' as const,
        stateUntil: null,
        cefrOverride: 'B2',
        metadata: null,
        nextDueAt: new Date('2026-05-13T12:00:00.000Z'),
        intervalDays: 3,
        performanceScore: 0.8,
      },
      {
        cardId: 'card-1',
        content: '补偿',
        meaning: 'to compensate',
        cardType: 'word',
        examples: [],
        mnemonics: [],
        llmInstructions: null,
        updatedAt: new Date('2026-05-01T12:00:00.000Z'),
        sourceGroup: { groupId: 'group-core', groupName: 'Core' },
        addedFrom: 'draw_pile:group-core',
        addedAt: new Date('2026-05-08T12:00:00.000Z'),
        lastUsedAt: null,
        usageCount: 0,
        state: 'active' as const,
        stateUntil: null,
        cefrOverride: null,
        metadata: null,
        nextDueAt: null,
        intervalDays: null,
        performanceScore: null,
      },
    ]),
    getTranslationDrillDismissSchedule: vi.fn(async (_userId: string, _languageId: string, cardId: string) => ({
      cardId,
      recommendedDays: 5,
      optionDays: [1, 5, 15, 30],
    })),
    listAvailablePosPiles: vi.fn(async () => []),
  };
  const deps = baseDeps as unknown as TranslationDrillLoaderDeps;

  it('loads Translation Drills home data with grouped context and challenge inputs', async () => {
    const result = await loadTranslationDrillHomeData('user-1', 'zh', database, deps);

    expect(result.summary).toEqual({
      configuredGroupCount: 1,
      activeCardCount: 2,
      snoozedCardCount: 0,
      dismissedCardCount: 0,
      disabledCardCount: 0,
      remainingDrawCount: 2,
      hasConfiguredDrawPiles: true,
      hasVisibleContext: true,
    });
    expect(result.ungroupedContextCards).toEqual([
      expect.objectContaining({
        cardId: 'card-2',
        addedFrom: 'pinned_from_review',
      }),
    ]);
    expect(result.challenge.generationInput).toEqual({
      activeCardCount: 2,
      cefrLevel: 'B1',
      cards: [
        expect.objectContaining({ cardId: 'card-2', dismissSchedule: expect.objectContaining({ recommendedDays: 5 }) }),
        expect.objectContaining({ cardId: 'card-1', dismissSchedule: expect.objectContaining({ recommendedDays: 5 }) }),
      ],
      suggestedSourceCardIds: ['card-2', 'card-1'],
    });
    expect(result.configuredGroups[0]?.activeCards[0]).toEqual(
      expect.objectContaining({
        cardId: 'card-1',
        dismissSchedule: {
          recommendedDays: 5,
          optionDays: [1, 5, 15, 30],
        },
      }),
    );
  });

  it('returns 404 when the requested language is not active for the user', async () => {
    baseDeps.getActiveUserLanguages.mockResolvedValueOnce([]);

    await expect(loadTranslationDrillHomeData('user-1', 'ja', database, deps)).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<TranslationDrillRequestError>);
  });

  it('normalizes dismiss schedules so Tomorrow is always first', async () => {
    baseDeps.getTranslationDrillDismissSchedule.mockImplementation(async (_userId: string, _languageId: string, cardId: string) => ({
      cardId,
      recommendedDays: 14,
      optionDays: [30, 14],
    }));

    const result = await loadTranslationDrillHomeData('user-1', 'zh', database, deps);

    expect(result.configuredGroups[0]?.activeCards[0]?.dismissSchedule).toEqual({
      recommendedDays: 14,
      optionDays: [1, 14, 30],
    });
    expect(result.challenge.generationInput.cards[0]?.dismissSchedule).toEqual({
      recommendedDays: 14,
      optionDays: [1, 14, 30],
    });
  });
});

describe('applyTranslationDrillAction', () => {
  const database = {} as never;
  const now = new Date('2026-05-10T12:00:00.000Z');

  const actionDeps = {
    getActiveUserLanguages: vi.fn(async () => [{
      userId: 'user-1',
      languageId: 'zh',
      languageName: 'Chinese',
      isActive: true,
      cefrLevel: 'B1',
      settings: null,
      createdAt: null,
    }]),
    listTranslationDrillChallengeCards: vi.fn(async () => [
      {
        cardId: 'card-1',
        content: '补偿',
        meaning: 'to compensate',
        cardType: 'word',
        examples: [],
        mnemonics: [],
        llmInstructions: null,
        updatedAt: new Date('2026-05-01T12:00:00.000Z'),
        sourceGroup: { groupId: 'group-core', groupName: 'Core' },
        addedFrom: 'draw_pile:group-core',
        addedAt: new Date('2026-05-08T12:00:00.000Z'),
        lastUsedAt: null,
        usageCount: 0,
        state: 'active' as const,
        stateUntil: null,
        cefrOverride: null,
        metadata: null,
        nextDueAt: null,
        intervalDays: null,
        performanceScore: null,
      },
    ]),
    drawTranslationDrillCard: vi.fn(async () => ({
      cardId: 'card-drawn',
      content: '经历',
      meaning: 'experience',
      cardType: 'word',
      examples: [],
      mnemonics: [],
      llmInstructions: null,
      updatedAt: new Date('2026-05-03T12:00:00.000Z'),
      sourceGroup: { groupId: 'group-core', groupName: 'Core' },
      addedFrom: 'draw_pile:group-core',
      addedAt: now,
      lastUsedAt: null,
      usageCount: 0,
      state: 'active' as const,
      stateUntil: null,
      cefrOverride: null,
      metadata: null,
      nextDueAt: null,
      intervalDays: null,
      performanceScore: null,
    })),
    drawTranslationDrillPosCard: vi.fn(async () => ({
      cardId: 'card-drawn-pos',
      content: '跑',
      meaning: 'to run',
      cardType: 'word',
      examples: [],
      mnemonics: [],
      llmInstructions: null,
      updatedAt: new Date('2026-05-03T12:00:00.000Z'),
      sourceGroup: null,
      addedFrom: 'draw_pile_pos:verb',
      addedAt: now,
      lastUsedAt: null,
      usageCount: 0,
      state: 'active' as const,
      stateUntil: null,
      cefrOverride: null,
      metadata: null,
      nextDueAt: null,
      intervalDays: null,
      performanceScore: null,
    })),
    snoozeTranslationDrillCard: vi.fn(async () => ({
      cardId: 'card-1',
      state: 'snoozed' as const,
      stateUntil: new Date('2026-05-11T12:00:00.000Z'),
      nextDueAt: null,
      intervalDays: null,
      usageCount: 0,
      performanceScore: null,
    })),
    disableTranslationDrillCard: vi.fn(async () => ({
      cardId: 'card-1',
      state: 'disabled' as const,
      stateUntil: null,
      nextDueAt: null,
      intervalDays: null,
      usageCount: 0,
      performanceScore: null,
    })),
    dismissTranslationDrillCard: vi.fn(async () => ({
      cardId: 'card-1',
      state: 'dismissed' as const,
      stateUntil: new Date('2026-05-15T12:00:00.000Z'),
      nextDueAt: new Date('2026-05-15T12:00:00.000Z'),
      intervalDays: 5,
      usageCount: 1,
      performanceScore: null,
    })),
    recordTranslationDrillChallengeUsage: vi.fn(async () => undefined),
    getTranslationDrillDismissSchedule: vi.fn(async () => ({
      cardId: 'card-1',
      recommendedDays: 5,
      optionDays: [1, 5, 15, 30],
    })),
    now: vi.fn(() => now),
  };
  const deps = actionDeps as unknown as TranslationDrillActionDeps;

  it('draws cards and returns UI-friendly card data', async () => {
    const result = await applyTranslationDrillAction(
      'user-1',
      'zh',
      {
        action: 'draw',
        groupId: 'group-core',
      },
      database,
      deps,
    );

    expect(actionDeps.drawTranslationDrillCard).toHaveBeenCalledWith(
      'user-1',
      'zh',
      'group-core',
      { occurredAt: now },
      database,
    );
    expect(result).toMatchObject({
      action: 'draw',
      card: {
        cardId: 'card-drawn',
      },
    });
  });

  it('uses the default 24-hour snooze duration for snooze actions', async () => {
    await applyTranslationDrillAction(
      'user-1',
      'zh',
      {
        action: 'snooze',
        cardId: 'card-1',
      },
      database,
      deps,
    );

    expect(actionDeps.snoozeTranslationDrillCard).toHaveBeenCalledWith(
      'user-1',
      'zh',
      'card-1',
      new Date('2026-05-11T12:00:00.000Z'),
      { occurredAt: now },
      database,
    );
  });

  it('uses the recommended dismiss schedule when no explicit interval is provided', async () => {
    const result = await applyTranslationDrillAction(
      'user-1',
      'zh',
      {
        action: 'dismiss',
        cardId: 'card-1',
      },
      database,
      deps,
    );

    expect(actionDeps.dismissTranslationDrillCard).toHaveBeenCalledWith(
      'user-1',
      'zh',
      'card-1',
      new Date('2026-05-15T12:00:00.000Z'),
      { occurredAt: now },
      database,
    );
    expect(result).toMatchObject({
      action: 'dismiss',
      intervalDays: 5,
    });
  });

  it('validates challenge source cards against the active context', async () => {
    const planChallenge = vi.fn(async () => ({
      prompt: 'Can you make up for the delay before everyone notices?',
      sourceCardIds: ['card-1'],
    }));
    const result = await applyTranslationDrillAction(
      'user-1',
      'zh',
      {
        action: 'challenge-start',
        sourceCardIds: ['card-1'],
      },
      database,
      deps,
      { planChallenge },
    );

    expect(planChallenge).toHaveBeenCalledWith(expect.objectContaining({
      targetLanguageName: 'Chinese',
      cefrLevel: 'B1',
      previousSourceCardIds: undefined,
      mustUseAllCandidateCards: true,
    }));
    expect(actionDeps.recordTranslationDrillChallengeUsage).toHaveBeenCalledWith(
      'user-1',
      'zh',
      ['card-1'],
      { occurredAt: now },
      database,
    );
    expect(result).toMatchObject({
      action: 'challenge-start',
      conversationReset: true,
      challenge: {
        prompt: 'Can you make up for the delay before everyone notices?',
        sourceCardIds: ['card-1'],
      },
    });
  });

  it('passes the full active challenge context to the planner for automatic challenge selection', async () => {
    const rotatingDeps = {
      ...actionDeps,
      listTranslationDrillChallengeCards: vi.fn(async () => [
        {
          cardId: 'card-2',
          content: '把握',
          meaning: 'to grasp',
          cardType: 'word',
          examples: [],
          mnemonics: [],
          llmInstructions: 'Prefer aspect pairs',
          updatedAt: new Date('2026-05-02T12:00:00.000Z'),
          sourceGroup: null,
          addedFrom: 'pinned_from_review',
          addedAt: new Date('2026-05-09T12:00:00.000Z'),
          lastUsedAt: new Date('2026-05-09T12:05:00.000Z'),
          usageCount: 2,
          state: 'active' as const,
          stateUntil: null,
          cefrOverride: 'B2',
          metadata: null,
          nextDueAt: new Date('2026-05-13T12:00:00.000Z'),
          intervalDays: 3,
          performanceScore: 0.8,
        },
        {
          cardId: 'card-1',
          content: '补偿',
          meaning: 'to compensate',
          cardType: 'word',
          examples: [],
          mnemonics: [],
          llmInstructions: null,
          updatedAt: new Date('2026-05-01T12:00:00.000Z'),
          sourceGroup: { groupId: 'group-core', groupName: 'Core' },
          addedFrom: 'draw_pile:group-core',
          addedAt: new Date('2026-05-08T12:00:00.000Z'),
          lastUsedAt: null,
          usageCount: 0,
          state: 'active' as const,
          stateUntil: null,
          cefrOverride: null,
          metadata: null,
          nextDueAt: null,
          intervalDays: null,
          performanceScore: null,
        },
      ]),
    } as unknown as TranslationDrillActionDeps;
    const planChallenge = vi.fn(async () => ({
      prompt: 'She finally got a handle on the situation.',
      sourceCardIds: ['card-2'],
    }));

    const result = await applyTranslationDrillAction(
      'user-1',
      'zh',
      {
        action: 'challenge-start',
        previousSourceCardIds: ['card-2', 'card-1'],
      },
      database,
      rotatingDeps,
      { planChallenge },
    );

    expect(planChallenge).toHaveBeenCalledWith(expect.objectContaining({
      previousSourceCardIds: ['card-2', 'card-1'],
      mustUseAllCandidateCards: false,
      candidateCards: expect.arrayContaining([
        expect.objectContaining({ cardId: 'card-2' }),
        expect.objectContaining({ cardId: 'card-1' }),
      ]),
    }));
    expect(actionDeps.recordTranslationDrillChallengeUsage).toHaveBeenCalledWith(
      'user-1',
      'zh',
      ['card-2'],
      { occurredAt: now },
      database,
    );
    expect(result).toMatchObject({
      action: 'challenge-start',
      challenge: {
        prompt: 'She finally got a handle on the situation.',
        sourceCardIds: ['card-2'],
      },
    });
  });

  it('shortlists automatic challenge candidates to the least-used half before planning', async () => {
    const shortlistDeps = {
      ...actionDeps,
      listTranslationDrillChallengeCards: vi.fn(async () => [
        {
          cardId: 'card-1',
          content: '补偿',
          meaning: 'to compensate',
          cardType: 'word',
          examples: [],
          mnemonics: [],
          llmInstructions: null,
          updatedAt: new Date('2026-05-01T12:00:00.000Z'),
          sourceGroup: { groupId: 'group-core', groupName: 'Core' },
          addedFrom: 'draw_pile:group-core',
          addedAt: new Date('2026-05-08T12:00:00.000Z'),
          lastUsedAt: null,
          usageCount: 0,
          state: 'active' as const,
          stateUntil: null,
          cefrOverride: null,
          metadata: null,
          nextDueAt: null,
          intervalDays: null,
          performanceScore: null,
        },
        {
          cardId: 'card-2',
          content: '把握',
          meaning: 'to grasp',
          cardType: 'word',
          examples: [],
          mnemonics: [],
          llmInstructions: 'Prefer aspect pairs',
          updatedAt: new Date('2026-05-02T12:00:00.000Z'),
          sourceGroup: null,
          addedFrom: 'pinned_from_review',
          addedAt: new Date('2026-05-09T12:00:00.000Z'),
          lastUsedAt: new Date('2026-05-09T12:05:00.000Z'),
          usageCount: 1,
          state: 'active' as const,
          stateUntil: null,
          cefrOverride: 'B2',
          metadata: null,
          nextDueAt: new Date('2026-05-13T12:00:00.000Z'),
          intervalDays: 3,
          performanceScore: 0.8,
        },
        {
          cardId: 'card-3',
          content: '当然',
          meaning: 'of course',
          cardType: 'word',
          examples: [],
          mnemonics: [],
          llmInstructions: null,
          updatedAt: new Date('2026-05-03T12:00:00.000Z'),
          sourceGroup: null,
          addedFrom: 'pinned_from_review',
          addedAt: new Date('2026-05-09T12:10:00.000Z'),
          lastUsedAt: new Date('2026-05-09T12:10:00.000Z'),
          usageCount: 2,
          state: 'active' as const,
          stateUntil: null,
          cefrOverride: null,
          metadata: null,
          nextDueAt: null,
          intervalDays: null,
          performanceScore: null,
        },
        {
          cardId: 'card-4',
          content: '解决',
          meaning: 'to solve',
          cardType: 'word',
          examples: [],
          mnemonics: [],
          llmInstructions: null,
          updatedAt: new Date('2026-05-04T12:00:00.000Z'),
          sourceGroup: null,
          addedFrom: 'pinned_from_review',
          addedAt: new Date('2026-05-09T12:12:00.000Z'),
          lastUsedAt: new Date('2026-05-09T12:12:00.000Z'),
          usageCount: 3,
          state: 'active' as const,
          stateUntil: null,
          cefrOverride: null,
          metadata: null,
          nextDueAt: null,
          intervalDays: null,
          performanceScore: null,
        },
        {
          cardId: 'card-5',
          content: '其实',
          meaning: 'actually',
          cardType: 'word',
          examples: [],
          mnemonics: [],
          llmInstructions: null,
          updatedAt: new Date('2026-05-05T12:00:00.000Z'),
          sourceGroup: null,
          addedFrom: 'pinned_from_review',
          addedAt: new Date('2026-05-09T12:15:00.000Z'),
          lastUsedAt: new Date('2026-05-09T12:15:00.000Z'),
          usageCount: 4,
          state: 'active' as const,
          stateUntil: null,
          cefrOverride: null,
          metadata: null,
          nextDueAt: null,
          intervalDays: null,
          performanceScore: null,
        },
      ]),
    } as unknown as TranslationDrillActionDeps;
    const planChallenge = vi.fn(async () => ({
      prompt: 'Of course we can solve that later.',
      sourceCardIds: ['card-1'],
    }));

    await applyTranslationDrillAction(
      'user-1',
      'zh',
      {
        action: 'challenge-start',
      },
      database,
      shortlistDeps,
      { planChallenge },
    );

    expect(planChallenge).toHaveBeenCalledWith(expect.objectContaining({
      candidateCards: [
        expect.objectContaining({ cardId: 'card-1' }),
        expect.objectContaining({ cardId: 'card-2' }),
      ],
    }));
  });

  it('rejects invalid planner output before returning a challenge', async () => {
    await expect(applyTranslationDrillAction(
      'user-1',
      'zh',
      {
        action: 'challenge-start',
        sourceCardIds: ['card-1'],
      },
      database,
      deps,
      {
        planChallenge: vi.fn(async () => ({
          prompt: 'Use the bad card.',
          sourceCardIds: ['card-2'],
        })),
      },
    )).rejects.toMatchObject({
      status: 500,
      message: 'The challenge generator returned an invalid source-card selection.',
    } satisfies Partial<TranslationDrillRequestError>);
  });

  it('rejects invalid Translation Drills action payloads', async () => {
    await expect(applyTranslationDrillAction(
      'user-1',
      'zh',
      {
        action: 'dismiss',
        cardId: 'card-1',
        returnInDays: 0,
      },
      database,
      deps,
    )).rejects.toMatchObject({
      status: 400,
    } satisfies Partial<TranslationDrillRequestError>);
  });

  it('rejects challenge cards that are not active in context', async () => {
    await expect(applyTranslationDrillAction(
      'user-1',
      'zh',
      {
        action: 'challenge-start',
        sourceCardIds: ['card-2'],
      },
      database,
      deps,
    )).rejects.toMatchObject({
      status: 400,
      message: 'Challenge source cards must come from the active Translation Drills context.',
    } satisfies Partial<TranslationDrillRequestError>);
  });
});
