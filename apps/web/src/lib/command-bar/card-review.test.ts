import { describe, expect, it, vi } from 'vitest';
import { resolveCardReviewCommandResponse } from './card-review.js';
import { resolveRouteContext } from './shared.js';
import { cardReviewSessionActions } from '$lib/stores/cardReviewSessionActions.js';

describe('resolveCardReviewCommandResponse', () => {
  it('returns null for non-Card Review commands', async () => {
    await expect(resolveCardReviewCommandResponse({
      input: '/help',
      routeContext: resolveRouteContext('/zh/card-review'),
      surfaceContext: null,
    })).resolves.toBeNull();
  });

  it('requires an active Card Review session before executing review commands', async () => {
    await expect(resolveCardReviewCommandResponse({
      input: '/pin',
      routeContext: resolveRouteContext('/zh/card-review'),
      surfaceContext: {
        surface: 'card_review_setup',
        selection: {
          groupIds: ['group-1'],
          limit: null,
          countMode: 'all_due',
        },
      },
    })).resolves.toBe('Start a Card Review session before using that command.');
  });

  it('routes /next through the session action store when a session is active', async () => {
    const nextSpy = vi.spyOn(cardReviewSessionActions, 'requestNext').mockResolvedValue('Moved to the next card.');

    await expect(resolveCardReviewCommandResponse({
      input: '/next',
      routeContext: resolveRouteContext('/zh/card-review/session'),
      surfaceContext: {
        surface: 'card_review_session',
        selection: {
          groupIds: ['group-1'],
          limit: null,
          countMode: 'all_due',
        },
        queueCardIds: ['card-1', 'card-2'],
        currentCardId: 'card-1',
        initialTotalCount: 2,
        completedCount: 0,
      },
    })).resolves.toBe('Moved to the next card.');

    expect(nextSpy).toHaveBeenCalledWith('card-1');
  });

  it('ignores Card Review slash commands outside Card Review routes', async () => {
    await expect(resolveCardReviewCommandResponse({
      input: '/next',
      routeContext: resolveRouteContext('/zh/translation-drills'),
      surfaceContext: {
        surface: 'translation_drills',
        activeChallenge: null,
        focusedCardId: 'card-1',
      },
    })).resolves.toBeNull();
  });
});
