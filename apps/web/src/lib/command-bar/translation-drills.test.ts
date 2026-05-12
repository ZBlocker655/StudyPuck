import { beforeEach, describe, expect, it, vi } from 'vitest';
import { translationDrillSession } from '$lib/stores/translationDrillSession.js';
import { resolveTranslationDrillCommandResponse } from './translation-drills.js';
import { translationDrillSessionActions } from '$lib/stores/translationDrillSessionActions.js';
import type { TranslationDrillHomeData } from '$lib/server/translation-drills.js';

function createHome(): TranslationDrillHomeData {
  return {
    summary: {
      configuredGroupCount: 1,
      activeCardCount: 1,
      snoozedCardCount: 0,
      dismissedCardCount: 0,
      disabledCardCount: 0,
      remainingDrawCount: 2,
      hasConfiguredDrawPiles: true,
      hasVisibleContext: true,
    },
    availableGroups: [{ groupId: 'group-1', groupName: 'HSK2' }],
    configuredGroups: [{
      groupId: 'group-1',
      groupName: 'HSK2',
      drawPileName: null,
      pileSizeLimit: 4,
      remainingCardCount: 2,
      activeCards: [{
        cardId: 'card-1',
        content: '经历',
        meaning: 'to experience',
        cardType: 'word',
        examples: [],
        mnemonics: [],
        llmInstructions: null,
        updatedAtIso: null,
        sourceGroup: { groupId: 'group-1', groupName: 'HSK2' },
        addedFrom: 'draw_pile:group-1',
        addedAtIso: null,
        lastUsedAtIso: null,
        usageCount: 0,
        state: 'active',
        stateUntilIso: null,
        cefrOverride: null,
        nextDueAtIso: null,
        intervalDays: null,
        performanceScore: null,
        dismissSchedule: {
          recommendedDays: 5,
          optionDays: [1, 5, 15, 30],
        },
      }],
      snoozedCards: [],
    }],
    ungroupedContextCards: [],
    challenge: {
      activeChallenge: null,
      generationInput: {
        activeCardCount: 1,
        cefrLevel: 'B1',
        cards: [{
          cardId: 'card-1',
          content: '经历',
          meaning: 'to experience',
          cardType: 'word',
          examples: [],
          mnemonics: [],
          llmInstructions: null,
          updatedAtIso: null,
          sourceGroup: { groupId: 'group-1', groupName: 'HSK2' },
          addedFrom: 'draw_pile:group-1',
          addedAtIso: null,
          lastUsedAtIso: null,
          usageCount: 0,
          state: 'active',
          stateUntilIso: null,
          cefrOverride: null,
          nextDueAtIso: null,
          intervalDays: null,
          performanceScore: null,
          dismissSchedule: {
            recommendedDays: 5,
            optionDays: [1, 5, 15, 30],
          },
        }],
        suggestedSourceCardIds: ['card-1'],
      },
    },
  };
}

describe('resolveTranslationDrillCommandResponse', () => {
  beforeEach(() => {
    translationDrillSession.reset();
    vi.restoreAllMocks();
  });

  it('returns a context summary for /context', async () => {
    translationDrillSession.sync({
      lang: 'zh',
      home: createHome(),
      activeChallenge: null,
      focusedCardId: 'card-1',
    });

    await expect(resolveTranslationDrillCommandResponse('/context')).resolves.toBe('Active context: 经历.');
  });

  it('dispatches /next through the Translation Drills action store', async () => {
    translationDrillSession.sync({
      lang: 'zh',
      home: createHome(),
      activeChallenge: null,
      focusedCardId: 'card-1',
    });

    const nextSpy = vi.spyOn(translationDrillSessionActions, 'requestNext').mockResolvedValue({
      message: 'New challenge ready.',
      conversationReset: true,
    });

    await expect(resolveTranslationDrillCommandResponse('/next')).resolves.toEqual({
      message: 'New challenge ready.',
      conversationReset: true,
    });
    expect(nextSpy).toHaveBeenCalled();
  });

  it('falls back to the first active card for snooze or dismiss commands', async () => {
    translationDrillSession.sync({
      lang: 'zh',
      home: createHome(),
      activeChallenge: null,
      focusedCardId: null,
    });

    const snoozeSpy = vi.spyOn(translationDrillSessionActions, 'requestSnooze').mockResolvedValue({
      message: '经历 snoozed.',
    });
    const dismissSpy = vi.spyOn(translationDrillSessionActions, 'requestDismiss').mockResolvedValue({
      message: '经历 dismissed.',
    });

    await expect(resolveTranslationDrillCommandResponse('/snooze')).resolves.toEqual({
      message: '经历 snoozed.',
    });
    await expect(resolveTranslationDrillCommandResponse('/dismiss')).resolves.toEqual({
      message: '经历 dismissed.',
    });
    expect(snoozeSpy).toHaveBeenCalledWith('card-1');
    expect(dismissSpy).toHaveBeenCalledWith('card-1');
  });
});
