import { describe, expect, it, vi } from 'vitest';
import {
  applyCardReviewSessionAction,
  CardReviewRequestError,
  type CardReviewActionDeps,
  type CardReviewLoaderDeps,
  loadCardReviewHomeData,
  loadCardReviewSessionData,
} from './card-review.js';

describe('Card Review server helpers', () => {
  const database = {} as never;

  const baseDeps = {
    getActiveUserLanguages: vi.fn(async () => [{
      userId: 'user-1',
      languageId: 'zh',
      languageName: 'Chinese',
      isActive: true,
      cefrLevel: null,
      settings: null,
      createdAt: null,
    }]),
    getCardReviewHomeStats: vi.fn(async () => ({
      cardsInRotation: 12,
      dueNowCount: 5,
      reviewedTodayCount: 2,
      currentStreakDays: 3,
      lastReviewedAt: new Date('2026-05-09T12:00:00.000Z'),
    })),
    listCardReviewGroupSummaries: vi.fn(async () => [
      {
        groupId: 'group-core',
        groupName: 'Core',
        activeCardCount: 7,
        dueCardCount: 3,
        nextDueAt: null,
      },
      {
        groupId: 'group-extended',
        groupName: 'Extended',
        activeCardCount: 5,
        dueCardCount: 2,
        nextDueAt: new Date('2026-05-11T12:00:00.000Z'),
      },
    ]),
    listCardReviewSessionCards: vi.fn(async () => [
      {
        cardId: 'card-1',
        content: '补偿',
        meaning: 'to compensate',
        cardType: 'word',
        examples: ['我们以后再补偿这次错过的时间。'],
        mnemonics: ['compensate later'],
        llmInstructions: null,
        updatedAt: new Date('2026-05-01T12:00:00.000Z'),
        groups: [{ groupId: 'group-core', groupName: 'Core' }],
        nextDueAt: new Date('2026-05-09T12:00:00.000Z'),
        intervalDays: 2,
        easeFactor: 2.5,
        reviewCount: 1,
        lastReviewedAt: new Date('2026-05-07T12:00:00.000Z'),
        state: 'active' as const,
        snoozedUntil: null,
      },
    ]),
    getGroups: vi.fn(async () => [
      { groupId: 'group-extended', groupName: 'Extended' },
      { groupId: 'group-core', groupName: 'Core' },
    ]),
  };
  const deps = baseDeps as unknown as CardReviewLoaderDeps;

  it('loads card review home data with parsed selection and preview totals', async () => {
    const url = new URL('https://studypuck.test/zh/card-review?group=group-core&group=group-extended&limit=10');

    const result = await loadCardReviewHomeData('user-1', 'zh', url, database, deps);

    expect(result.selection).toEqual({
      groupIds: ['group-core', 'group-extended'],
      limit: 10,
      countMode: 'limit',
    });
    expect(result.stats).toEqual({
      cardsInRotation: 12,
      dueNowCount: 5,
      reviewedTodayCount: 2,
      currentStreakDays: 3,
      lastReviewedAtIso: '2026-05-09T12:00:00.000Z',
    });
    expect(result.sessionPreview).toEqual({
      selectedGroupCount: 2,
      selectedDueCount: 5,
      nextDueAtIso: '2026-05-11T12:00:00.000Z',
    });
  });

  it('loads card review session data from the parsed URL state', async () => {
    const url = new URL('https://studypuck.test/zh/card-review/session?group=group-core&limit=5');

    const result = await loadCardReviewSessionData('user-1', 'zh', url, database, deps);

    expect(baseDeps.listCardReviewSessionCards).toHaveBeenCalledWith(
      'user-1',
      'zh',
      {
        groupIds: ['group-core'],
        limit: 5,
      },
      database,
    );
    expect(result.items[0]).toMatchObject({
      cardId: 'card-1',
      nextDueAtIso: '2026-05-09T12:00:00.000Z',
    });
    expect(result.availableGroups).toEqual([
      { groupId: 'group-core', groupName: 'Core' },
      { groupId: 'group-extended', groupName: 'Extended' },
    ]);
  });

  it('rejects invalid session input before hitting the data layer', async () => {
    const url = new URL('https://studypuck.test/zh/card-review/session?group=group-core&limit=0');

    await expect(loadCardReviewSessionData('user-1', 'zh', url, database, deps)).rejects.toMatchObject({
      status: 400,
    } satisfies Partial<CardReviewRequestError>);
  });

  it('requires at least one selected group before loading a review session', async () => {
    const url = new URL('https://studypuck.test/zh/card-review/session');

    await expect(loadCardReviewSessionData('user-1', 'zh', url, database, deps)).rejects.toMatchObject({
      status: 400,
      message: 'Select at least one group before starting a review session.',
    } satisfies Partial<CardReviewRequestError>);
  });

  it('returns 404 when the requested language is not active for the user', async () => {
    baseDeps.getActiveUserLanguages.mockResolvedValueOnce([]);
    const url = new URL('https://studypuck.test/ja/card-review');

    await expect(loadCardReviewHomeData('user-1', 'ja', url, database, deps)).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<CardReviewRequestError>);
  });
});

describe('applyCardReviewSessionAction', () => {
  const database = {} as never;
  const now = new Date('2026-05-10T12:00:00.000Z');
  const baseResult = {
    eventId: 'event-1',
    cardId: 'card-1',
    rating: null,
    occurredAt: now,
    state: 'active' as const,
    snoozedUntil: null,
    nextDueAt: new Date('2026-05-12T12:00:00.000Z'),
    intervalDays: 2,
    easeFactor: 2.5,
    reviewCount: 4,
  };

  const actionDeps = {
    getActiveUserLanguages: vi.fn(async () => [{
      userId: 'user-1',
      languageId: 'zh',
      languageName: 'Chinese',
      isActive: true,
      cefrLevel: null,
      settings: null,
      createdAt: null,
    }]),
    recordCardReviewRating: vi.fn(async () => ({
      ...baseResult,
      eventType: 'rated' as const,
      rating: 'easy' as const,
    })),
    recordCardReviewPinToDrills: vi.fn(async () => ({
      ...baseResult,
      eventType: 'pinned_to_drills' as const,
    })),
    snoozeCardForReview: vi.fn(async () => ({
      ...baseResult,
      eventType: 'snoozed' as const,
      state: 'snoozed' as const,
      snoozedUntil: new Date('2026-05-11T12:00:00.000Z'),
    })),
    disableCardForReview: vi.fn(async () => ({
      ...baseResult,
      eventType: 'disabled' as const,
      state: 'disabled' as const,
    })),
    now: vi.fn(() => now),
  };
  const deps = actionDeps as unknown as CardReviewActionDeps;

  it('records a rating action and returns a UI-friendly response', async () => {
    const result = await applyCardReviewSessionAction(
      'user-1',
      'zh',
      {
        action: 'rate',
        cardId: 'card-1',
        rating: 'easy',
      },
      database,
      deps,
    );

    expect(actionDeps.recordCardReviewRating).toHaveBeenCalledWith(
      'user-1',
      'zh',
      'card-1',
      'easy',
      { reviewedAt: now },
      database,
    );
    expect(result).toMatchObject({
      action: 'rate',
      cardId: 'card-1',
      rating: 'easy',
      occurredAtIso: '2026-05-10T12:00:00.000Z',
      message: 'Easy recorded.',
    });
  });

  it('uses the default 24-hour snooze duration for snooze actions', async () => {
    await applyCardReviewSessionAction(
      'user-1',
      'zh',
      {
        action: 'snooze',
        cardId: 'card-1',
      },
      database,
      deps,
    );

    expect(actionDeps.snoozeCardForReview).toHaveBeenCalledWith(
      'user-1',
      'zh',
      'card-1',
      new Date('2026-05-11T12:00:00.000Z'),
      { occurredAt: now },
      database,
    );
  });

  it('rejects invalid review action payloads', async () => {
    await expect(applyCardReviewSessionAction(
      'user-1',
      'zh',
      {
        action: 'rate',
        cardId: 'card-1',
      },
      database,
      deps,
    )).rejects.toMatchObject({
      status: 400,
    } satisfies Partial<CardReviewRequestError>);
  });

  it('converts missing-card mutation errors into request errors', async () => {
    actionDeps.disableCardForReview.mockRejectedValueOnce(new Error('That card is not available for review.'));

    await expect(applyCardReviewSessionAction(
      'user-1',
      'zh',
      {
        action: 'disable',
        cardId: 'card-1',
      },
      database,
      deps,
    )).rejects.toMatchObject({
      status: 404,
      message: 'That card is not available for review.',
    } satisfies Partial<CardReviewRequestError>);
  });
});
