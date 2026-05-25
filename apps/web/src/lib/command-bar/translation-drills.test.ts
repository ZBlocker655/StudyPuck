import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveRouteContext } from '$lib/command-bar/shared.js';
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
        partOfSpeech: [],
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
    posPiles: [],
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
          partOfSpeech: [],
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
  const activeSurfaceContext = {
    surface: 'translation_drills' as const,
    activeChallenge: null,
    focusedCardId: 'card-1',
  };

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

    await expect(resolveTranslationDrillCommandResponse({
      input: '/context',
      routeContext: resolveRouteContext('/zh/translation-drills'),
      surfaceContext: activeSurfaceContext,
    })).resolves.toBe('Active context: 经历. No active challenge yet.');
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

    await expect(resolveTranslationDrillCommandResponse({
      input: '/next',
      routeContext: resolveRouteContext('/zh/translation-drills'),
      surfaceContext: activeSurfaceContext,
    })).resolves.toEqual({
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

    await expect(resolveTranslationDrillCommandResponse({
      input: '/snooze',
      routeContext: resolveRouteContext('/zh/translation-drills'),
      surfaceContext: { ...activeSurfaceContext, focusedCardId: null },
    })).resolves.toEqual({
      message: '经历 snoozed.',
    });
    await expect(resolveTranslationDrillCommandResponse({
      input: '/dismiss',
      routeContext: resolveRouteContext('/zh/translation-drills'),
      surfaceContext: { ...activeSurfaceContext, focusedCardId: null },
    })).resolves.toEqual({
      message: '经历 dismissed.',
    });
    expect(snoozeSpy).toHaveBeenCalledWith('card-1');
    expect(dismissSpy).toHaveBeenCalledWith('card-1');
  });

  it('returns null for Translation Drills commands outside the Translation Drills route context', async () => {
    await expect(resolveTranslationDrillCommandResponse({
      input: '/next',
      routeContext: resolveRouteContext('/zh/cards'),
      surfaceContext: activeSurfaceContext,
    })).resolves.toBeNull();
  });

  it('requires the Translation Drills surface to be active before handling drill commands', async () => {
    await expect(resolveTranslationDrillCommandResponse({
      input: '/next',
      routeContext: resolveRouteContext('/zh/translation-drills'),
      surfaceContext: null,
    })).resolves.toBe('Open Translation Drills before using that command.');
  });
});
