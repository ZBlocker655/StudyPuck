import { describe, expect, it, vi } from 'vitest';
import { resolveRouteContext } from '$lib/command-bar/shared.js';
import {
  areChatSuggestionsValidForContext,
  getAllowedSuggestionTypes,
  resolveCanonicalChatContext,
} from './chat-context.js';

describe('resolveCanonicalChatContext', () => {
  it('returns a non-actionable context when no database is provided', async () => {
    const context = await resolveCanonicalChatContext(
      'user-1',
      {
        routeContext: resolveRouteContext('/es/card-entry'),
        languageId: 'es',
        noteId: 'note-1',
        cardId: 'card-1',
      },
      null,
    );

    expect(context.contextType).toBe('non_actionable');
    expect(context.allowedSuggestionTypes).toEqual(['add_inbox_note']);
  });

  it('includes the languageId and routeContextType in non-actionable context', async () => {
    const context = await resolveCanonicalChatContext(
      'user-1',
      {
        routeContext: resolveRouteContext('/zh/translation-drills'),
        languageId: 'zh',
      },
      null,
    );

    expect(context.contextType).toBe('non_actionable');
    if (context.contextType === 'non_actionable') {
      expect(context.languageId).toBe('zh');
      expect(context.routeContextType).toBe('translation-drills');
      expect(context.allowedSuggestionTypes).toEqual(['add_inbox_note']);
    }
  });

  it('attempts a DB call when note workspace hints + database are provided', async () => {
    const fakeDb = {} as Parameters<typeof resolveCanonicalChatContext>[2];

    await expect(
      resolveCanonicalChatContext(
        'user-1',
        {
          routeContext: resolveRouteContext('/es/card-entry'),
          languageId: 'es',
          noteId: 'note-1',
        },
        fakeDb,
      ),
    ).rejects.toThrow();
  });

  it('resolves card-library list context with canonical list-state data', async () => {
    const context = await resolveCanonicalChatContext(
      'user-1',
      {
        routeContext: resolveRouteContext('/es/cards'),
        languageId: 'es',
        surfaceContext: {
          surface: 'card_library_list',
          filters: {
            searchText: 'tra',
            groupIds: ['group-1'],
            cardType: 'word',
          },
          selectedCardIds: ['card-2'],
        },
      },
      {} as Parameters<typeof resolveCanonicalChatContext>[2],
      {
        loadActiveCardDetailData: vi.fn(),
        loadCardLibraryData: vi.fn().mockResolvedValue({
          items: [
            {
              cardId: 'card-1',
              content: 'tren',
              meaning: 'train',
              cardType: 'word',
              updatedAtIso: null,
              updatedAtLabel: '1d',
              groups: [{ groupId: 'group-1', groupName: 'Travel' }],
            },
            {
              cardId: 'card-2',
              content: 'avion',
              meaning: 'airplane',
              cardType: 'word',
              updatedAtIso: null,
              updatedAtLabel: '2d',
              groups: [{ groupId: 'group-1', groupName: 'Travel' }],
            },
          ],
          totalCount: 2,
          filteredCardIds: ['card-1', 'card-2'],
          filters: {
            searchText: 'tra',
            groupIds: ['group-1'],
            cardType: 'word',
          },
          availableGroups: [
            { groupId: 'group-1', groupName: 'Travel', activeCardCount: 2 },
            { groupId: 'group-2', groupName: 'Food', activeCardCount: 1 },
          ],
        }),
        loadCardLibraryGroupsData: vi.fn(),
        loadGroupDetailData: vi.fn(),
        loadCardReviewHomeData: vi.fn(),
        loadCardReviewSessionData: vi.fn(),
      },
    );

    expect(context).toMatchObject({
      contextType: 'card_library_list',
      languageId: 'es',
      allowedSuggestionTypes: ['add_inbox_note', 'create_group'],
      listState: {
        searchText: 'tra',
        groupFilters: [{ groupId: 'group-1', groupName: 'Travel' }],
        cardType: 'word',
        ordering: 'updated_desc',
      },
      resultCount: 2,
      selectedCardIds: ['card-2'],
      selectedCards: [{ cardId: 'card-2', content: 'avion' }],
    });
    if (context.contextType === 'card_library_list') {
      expect(context.visibleCards[0]).toMatchObject({ cardId: 'card-1', content: 'tren' });
    }
  });

  it('resolves groups-list context with visible group snapshots', async () => {
    const context = await resolveCanonicalChatContext(
      'user-1',
      {
        routeContext: resolveRouteContext('/es/cards/groups'),
        languageId: 'es',
        surfaceContext: {
          surface: 'groups_list',
        },
      },
      {} as Parameters<typeof resolveCanonicalChatContext>[2],
      {
        loadActiveCardDetailData: vi.fn(),
        loadCardLibraryData: vi.fn(),
        loadCardLibraryGroupsData: vi.fn().mockResolvedValue({
          items: [
            {
              groupId: 'group-1',
              groupName: 'Travel',
              description: 'Trips and transit',
              activeCardCount: 4,
            },
          ],
          totalCount: 1,
        }),
        loadGroupDetailData: vi.fn(),
        loadCardReviewHomeData: vi.fn(),
        loadCardReviewSessionData: vi.fn(),
      },
    );

    expect(context).toMatchObject({
      contextType: 'groups_list',
      languageId: 'es',
      allowedSuggestionTypes: ['add_inbox_note', 'create_group'],
      listState: {
        scope: 'all_groups_for_language',
        ordering: 'group_name_asc',
      },
      resultCount: 1,
      visibleGroups: [{ groupId: 'group-1', groupName: 'Travel' }],
    });
  });

  it('resolves group-detail context with scoped filters and selection snapshots', async () => {
    const context = await resolveCanonicalChatContext(
      'user-1',
      {
        routeContext: resolveRouteContext('/es/cards/groups/group-1'),
        languageId: 'es',
        surfaceContext: {
          surface: 'group_detail',
          groupId: 'group-1',
          filters: {
            searchText: 'hol',
            cardType: 'word',
          },
          selectedCardIds: ['card-1'],
        },
      },
      {} as Parameters<typeof resolveCanonicalChatContext>[2],
      {
        loadActiveCardDetailData: vi.fn(),
        loadCardLibraryData: vi.fn(),
        loadCardLibraryGroupsData: vi.fn(),
        loadGroupDetailData: vi.fn().mockResolvedValue({
          group: {
            groupId: 'group-1',
            groupName: 'Greetings',
            description: 'Hello and goodbye',
            activeCardCount: 1,
          },
          cards: {
            items: [
              {
                cardId: 'card-1',
                content: 'hola',
                meaning: 'hello',
                cardType: 'word',
                updatedAtIso: null,
                updatedAtLabel: '1d',
                groups: [{ groupId: 'group-1', groupName: 'Greetings' }],
              },
            ],
            totalCount: 1,
            filteredCardIds: ['card-1'],
            filters: {
              searchText: 'hol',
              groupIds: [],
              cardType: 'word',
            },
            availableGroups: [{ groupId: 'group-2', groupName: 'Favorites', activeCardCount: 3 }],
          },
          addableCards: {
            items: [],
            totalCount: 0,
          },
        }),
        loadCardReviewHomeData: vi.fn(),
        loadCardReviewSessionData: vi.fn(),
      },
    );

    expect(context).toMatchObject({
      contextType: 'group_detail',
      languageId: 'es',
      allowedSuggestionTypes: ['add_inbox_note', 'create_group', 'add_card_to_group', 'remove_card_from_group'],
      group: {
        groupId: 'group-1',
        groupName: 'Greetings',
      },
      availableGroupsForAddition: [{ groupId: 'group-2', groupName: 'Favorites' }],
      listState: {
        searchText: 'hol',
        cardType: 'word',
        scopeGroupId: 'group-1',
      },
      selectedCardIds: ['card-1'],
      selectedCards: [{ cardId: 'card-1', content: 'hola' }],
    });
  });

  it('resolves add-cards drawer context with candidate filtering and selected snapshots', async () => {
    const context = await resolveCanonicalChatContext(
      'user-1',
      {
        routeContext: resolveRouteContext('/es/cards/groups/group-1'),
        languageId: 'es',
        surfaceContext: {
          surface: 'add_cards_to_group_drawer',
          groupId: 'group-1',
          searchText: 'ad',
          selectedCardIds: ['card-2'],
        },
      },
      {} as Parameters<typeof resolveCanonicalChatContext>[2],
      {
        loadActiveCardDetailData: vi.fn(),
        loadCardLibraryData: vi.fn(),
        loadCardLibraryGroupsData: vi.fn(),
        loadGroupDetailData: vi.fn().mockResolvedValue({
          group: {
            groupId: 'group-1',
            groupName: 'Greetings',
            description: 'Hello and goodbye',
            activeCardCount: 1,
          },
          cards: {
            items: [],
            totalCount: 0,
            filteredCardIds: [],
            filters: {
              searchText: '',
              groupIds: [],
              cardType: null,
            },
            availableGroups: [],
          },
          addableCards: {
            items: [
              {
                cardId: 'card-2',
                content: 'adios',
                meaning: 'goodbye',
                cardType: 'word',
                updatedAtIso: null,
                updatedAtLabel: '1d',
                groups: [],
              },
              {
                cardId: 'card-3',
                content: 'gracias',
                meaning: 'thanks',
                cardType: 'word',
                updatedAtIso: null,
                updatedAtLabel: '1d',
                groups: [],
              },
            ],
            totalCount: 2,
          },
        }),
        loadCardReviewHomeData: vi.fn(),
        loadCardReviewSessionData: vi.fn(),
      },
    );

    expect(context).toMatchObject({
      contextType: 'add_cards_to_group_drawer',
      languageId: 'es',
      allowedSuggestionTypes: ['add_inbox_note', 'add_card_to_group'],
      group: {
        groupId: 'group-1',
        groupName: 'Greetings',
      },
      listState: {
        searchText: 'ad',
        excludedGroupId: 'group-1',
        scope: 'active_language_cards_not_in_target_group',
      },
      candidateCount: 1,
      selectedCardIds: ['card-2'],
      selectedCards: [{ cardId: 'card-2', content: 'adios' }],
      visibleCards: [{ cardId: 'card-2', content: 'adios' }],
    });
  });

  it('resolves card-detail drawer context with actionable suggestion types', async () => {
    const context = await resolveCanonicalChatContext(
      'user-1',
      {
        routeContext: resolveRouteContext('/es/cards/groups/group-1'),
        languageId: 'es',
        focusedField: 'mnemonics',
        surfaceContext: {
          surface: 'card_detail_drawer',
          sourceSurface: 'group_detail',
          groupId: 'group-1',
          cardId: 'card-1',
        },
      },
      {} as Parameters<typeof resolveCanonicalChatContext>[2],
      {
        loadActiveCardDetailData: vi.fn().mockResolvedValue({
          card: {
            cardId: 'card-1',
            content: 'hola',
            meaning: 'hello',
            cardType: 'word',
            examples: ['Hola, Marta.'],
            mnemonics: ['Think of waving hello in a hall.'],
            llmInstructions: null,
            updatedAtIso: null,
            groups: [{ groupId: 'group-1', groupName: 'Greetings' }],
          },
          availableGroups: [
            { groupId: 'group-1', groupName: 'Greetings' },
            { groupId: 'group-2', groupName: 'Favorites' },
          ],
        }),
        loadCardLibraryData: vi.fn(),
        loadCardLibraryGroupsData: vi.fn(),
        loadGroupDetailData: vi.fn().mockResolvedValue({
          group: {
            groupId: 'group-1',
            groupName: 'Greetings',
            description: 'Hello and goodbye',
            activeCardCount: 1,
          },
          cards: {
            items: [],
            totalCount: 0,
            filteredCardIds: [],
            filters: {
              searchText: '',
              groupIds: [],
              cardType: null,
            },
            availableGroups: [],
          },
          addableCards: {
            items: [],
            totalCount: 0,
          },
        }),
        loadCardReviewHomeData: vi.fn(),
        loadCardReviewSessionData: vi.fn(),
      },
    );

    expect(context).toMatchObject({
      contextType: 'card_detail_drawer',
      languageId: 'es',
      sourceSurface: 'group_detail',
      likelyTargetCardId: 'card-1',
      likelyTargetFocusedField: 'mnemonics',
      allowedSuggestionTypes: [
        'append_example_sentence',
        'append_mnemonic',
        'add_inbox_note',
        'add_card_to_group',
        'remove_card_from_group',
      ],
      card: {
        cardId: 'card-1',
        content: 'hola',
        examples: ['Hola, Marta.'],
        mnemonics: ['Think of waving hello in a hall.'],
      },
      membershipGroups: [{ groupId: 'group-1', groupName: 'Greetings' }],
      addableGroups: [{ groupId: 'group-2', groupName: 'Favorites' }],
      group: {
        groupId: 'group-1',
        groupName: 'Greetings',
      },
    });
  });

  it('resolves card-review setup context from validated selection hints', async () => {
    const context = await resolveCanonicalChatContext(
      'user-1',
      {
        routeContext: resolveRouteContext('/es/card-review'),
        languageId: 'es',
        surfaceContext: {
          surface: 'card_review_setup',
          selection: {
            groupIds: ['group-1'],
            limit: 10,
            countMode: 'limit',
          },
        },
      },
      {} as Parameters<typeof resolveCanonicalChatContext>[2],
      {
        loadActiveCardDetailData: vi.fn(),
        loadCardLibraryData: vi.fn(),
        loadCardLibraryGroupsData: vi.fn(),
        loadGroupDetailData: vi.fn(),
        loadCardReviewHomeData: vi.fn().mockResolvedValue({
          stats: {
            cardsInRotation: 12,
            dueNowCount: 5,
            reviewedTodayCount: 2,
            currentStreakDays: 3,
            lastReviewedAtIso: '2026-05-10T12:00:00.000Z',
          },
          groups: [
            {
              groupId: 'group-1',
              groupName: 'Core',
              activeCardCount: 8,
              dueCardCount: 5,
              nextDueAtIso: '2026-05-11T12:00:00.000Z',
            },
          ],
          selection: {
            groupIds: ['group-1'],
            limit: 10,
            countMode: 'limit',
          },
          sessionPreview: {
            selectedGroupCount: 1,
            selectedDueCount: 5,
            nextDueAtIso: '2026-05-11T12:00:00.000Z',
          },
        }),
        loadCardReviewSessionData: vi.fn(),
      },
    );

    expect(context).toMatchObject({
      contextType: 'card_review_setup',
      languageId: 'es',
      allowedSuggestionTypes: ['add_inbox_note'],
      selection: {
        groupIds: ['group-1'],
        limit: 10,
        countMode: 'limit',
      },
      selectedGroups: [{ groupId: 'group-1', groupName: 'Core' }],
      sessionPreview: {
        selectedGroupCount: 1,
        selectedDueCount: 5,
      },
    });
  });

  it('resolves card-review session context with current card and upcoming queue snapshots', async () => {
    const context = await resolveCanonicalChatContext(
      'user-1',
      {
        routeContext: resolveRouteContext('/es/card-review/session'),
        languageId: 'es',
        surfaceContext: {
          surface: 'card_review_session',
          selection: {
            groupIds: ['group-1'],
            limit: 10,
            countMode: 'limit',
          },
          queueCardIds: ['card-1', 'card-2'],
          currentCardId: 'card-1',
          initialTotalCount: 3,
          completedCount: 1,
        },
      },
      {} as Parameters<typeof resolveCanonicalChatContext>[2],
      {
        loadActiveCardDetailData: vi.fn(),
        loadCardLibraryData: vi.fn(),
        loadCardLibraryGroupsData: vi.fn(),
        loadGroupDetailData: vi.fn(),
        loadCardReviewHomeData: vi.fn(),
        loadCardReviewSessionData: vi.fn().mockResolvedValue({
          selection: {
            groupIds: ['group-1'],
            limit: 10,
            countMode: 'limit',
          },
          totalCount: 3,
          availableGroups: [],
          items: [
            {
              cardId: 'card-1',
              content: 'hablar',
              meaning: 'to speak',
              cardType: 'word',
              examples: ['Quiero hablar contigo.'],
              mnemonics: ['Think of habitual speaking.'],
              llmInstructions: null,
              updatedAtIso: null,
              groups: [{ groupId: 'group-1', groupName: 'Core' }],
              nextDueAtIso: '2026-05-10T12:00:00.000Z',
              intervalDays: 2,
              easeFactor: 2.5,
              reviewCount: 3,
              lastReviewedAtIso: null,
              state: 'active',
              snoozedUntilIso: null,
            },
            {
              cardId: 'card-2',
              content: 'conversar',
              meaning: 'to converse',
              cardType: 'word',
              examples: [],
              mnemonics: [],
              llmInstructions: 'Prefer spoken-register examples.',
              updatedAtIso: null,
              groups: [{ groupId: 'group-1', groupName: 'Core' }],
              nextDueAtIso: '2026-05-10T13:00:00.000Z',
              intervalDays: 1,
              easeFactor: 2.3,
              reviewCount: 2,
              lastReviewedAtIso: null,
              state: 'active',
              snoozedUntilIso: null,
            },
          ],
        }),
      },
    );

    expect(context).toMatchObject({
      contextType: 'card_review_session',
      languageId: 'es',
      allowedSuggestionTypes: ['add_inbox_note', 'pin_review_card', 'snooze_review_card', 'next_review_card'],
      initialTotalCount: 3,
      completedCount: 1,
      remainingCount: 2,
      currentCardNumber: 2,
      currentCard: {
        cardId: 'card-1',
        content: 'hablar',
      },
      upcomingCards: [{ cardId: 'card-2', content: 'conversar' }],
    });
  });
});

describe('getAllowedSuggestionTypes', () => {
  it('returns create-group suggestions for card-library contexts', async () => {
    const context = await resolveCanonicalChatContext(
      'user-1',
      {
        routeContext: resolveRouteContext('/es/cards'),
        languageId: 'es',
        surfaceContext: {
          surface: 'card_library_list',
          filters: {
            searchText: '',
            groupIds: [],
            cardType: null,
          },
          selectedCardIds: [],
        },
      },
      {} as Parameters<typeof resolveCanonicalChatContext>[2],
      {
        loadActiveCardDetailData: vi.fn(),
        loadCardLibraryData: vi.fn().mockResolvedValue({
          items: [],
          totalCount: 0,
          filteredCardIds: [],
          filters: {
            searchText: '',
            groupIds: [],
            cardType: null,
          },
          availableGroups: [],
        }),
        loadCardLibraryGroupsData: vi.fn(),
        loadGroupDetailData: vi.fn(),
        loadCardReviewHomeData: vi.fn(),
        loadCardReviewSessionData: vi.fn(),
      },
    );

    expect(getAllowedSuggestionTypes(context)).toEqual(['add_inbox_note', 'create_group']);
  });

  it('returns drawer suggestion types for card-detail drawer context', async () => {
    const context = await resolveCanonicalChatContext(
      'user-1',
      {
        routeContext: resolveRouteContext('/es/cards'),
        languageId: 'es',
        surfaceContext: {
          surface: 'card_detail_drawer',
          sourceSurface: 'card_library_list',
          cardId: 'card-1',
        },
      },
      {} as Parameters<typeof resolveCanonicalChatContext>[2],
      {
        loadActiveCardDetailData: vi.fn().mockResolvedValue({
          card: {
            cardId: 'card-1',
            content: 'hola',
            meaning: 'hello',
            cardType: 'word',
            examples: [],
            mnemonics: [],
            llmInstructions: null,
            updatedAtIso: null,
            groups: [],
          },
          availableGroups: [],
        }),
        loadCardLibraryData: vi.fn(),
        loadCardLibraryGroupsData: vi.fn(),
        loadGroupDetailData: vi.fn(),
        loadCardReviewHomeData: vi.fn(),
        loadCardReviewSessionData: vi.fn(),
      },
    );

    expect(getAllowedSuggestionTypes(context)).toEqual([
      'append_example_sentence',
      'append_mnemonic',
      'add_inbox_note',
      'add_card_to_group',
      'remove_card_from_group',
    ]);
  });

  it('returns review session suggestion types for card-review session context', async () => {
    const context = await resolveCanonicalChatContext(
      'user-1',
      {
        routeContext: resolveRouteContext('/es/card-review/session'),
        languageId: 'es',
        surfaceContext: {
          surface: 'card_review_session',
          selection: {
            groupIds: ['group-1'],
            limit: null,
            countMode: 'all_due',
          },
          queueCardIds: ['card-1'],
          currentCardId: 'card-1',
          initialTotalCount: 1,
          completedCount: 0,
        },
      },
      {} as Parameters<typeof resolveCanonicalChatContext>[2],
      {
        loadActiveCardDetailData: vi.fn(),
        loadCardLibraryData: vi.fn(),
        loadCardLibraryGroupsData: vi.fn(),
        loadGroupDetailData: vi.fn(),
        loadCardReviewHomeData: vi.fn(),
        loadCardReviewSessionData: vi.fn().mockResolvedValue({
          selection: {
            groupIds: ['group-1'],
            limit: null,
            countMode: 'all_due',
          },
          totalCount: 1,
          availableGroups: [],
          items: [
            {
              cardId: 'card-1',
              content: 'hablar',
              meaning: 'to speak',
              cardType: 'word',
              examples: [],
              mnemonics: [],
              llmInstructions: null,
              updatedAtIso: null,
              groups: [{ groupId: 'group-1', groupName: 'Core' }],
              nextDueAtIso: null,
              intervalDays: 1,
              easeFactor: 2.5,
              reviewCount: 0,
              lastReviewedAtIso: null,
              state: 'active',
              snoozedUntilIso: null,
            },
          ],
        }),
      },
    );

    expect(getAllowedSuggestionTypes(context)).toEqual([
      'add_inbox_note',
      'pin_review_card',
      'snooze_review_card',
      'next_review_card',
    ]);
  });
});

describe('areChatSuggestionsValidForContext', () => {
  it('accepts add_inbox_note suggestions whenever the active language is known', () => {
    const actionableContext = {
      contextType: 'non_actionable',
      routeContextType: 'card-review',
      languageId: 'es',
      allowedSuggestionTypes: ['add_inbox_note'],
    } as Awaited<ReturnType<typeof resolveCanonicalChatContext>>;

    expect(
      areChatSuggestionsValidForContext(actionableContext, [
        {
          type: 'add_inbox_note',
          payload: { text: 'Know when to use hablar vs conversar' },
        },
      ]),
    ).toBe(true);

    const noLanguageContext = {
      contextType: 'non_actionable',
      routeContextType: 'settings',
      languageId: null,
      allowedSuggestionTypes: [],
    } as Awaited<ReturnType<typeof resolveCanonicalChatContext>>;

    expect(
      areChatSuggestionsValidForContext(noLanguageContext, [
        {
          type: 'add_inbox_note',
          payload: { text: 'Review a future point' },
        },
      ]),
    ).toBe(false);
  });

  it('accepts only in-scope group-management suggestions for group detail context', () => {
    const context = {
      contextType: 'group_detail',
      languageId: 'es',
      allowedSuggestionTypes: ['add_inbox_note', 'create_group', 'add_card_to_group', 'remove_card_from_group'],
      group: {
        groupId: 'group-1',
        groupName: 'Greetings',
        description: 'Hello and goodbye',
        activeCardCount: 1,
      },
      availableGroupsForAddition: [{ groupId: 'group-2', groupName: 'Favorites' }],
      listState: {
        searchText: '',
        cardType: null,
        scopeGroupId: 'group-1',
        ordering: 'updated_desc',
      },
      resultCount: 1,
      selectedCardIds: ['card-1'],
      selectedCards: [
        { cardId: 'card-1', content: 'hola', meaning: 'hello', cardType: 'word', groupNames: ['Greetings'] },
      ],
      visibleCards: [
        { cardId: 'card-1', content: 'hola', meaning: 'hello', cardType: 'word', groupNames: ['Greetings'] },
      ],
    } as Awaited<ReturnType<typeof resolveCanonicalChatContext>>;

    expect(
      areChatSuggestionsValidForContext(context, [
        {
          type: 'add_card_to_group',
          payload: { cardId: 'card-1', groupId: 'group-2' },
        },
        {
          type: 'remove_card_from_group',
          payload: { cardId: 'card-1', groupId: 'group-1' },
        },
      ]),
    ).toBe(true);

    expect(
      areChatSuggestionsValidForContext(context, [
        {
          type: 'add_card_to_group',
          payload: { cardId: 'card-999', groupId: 'group-2' },
        },
      ]),
    ).toBe(false);

    expect(
      areChatSuggestionsValidForContext(context, [
        {
          type: 'remove_card_from_group',
          payload: { cardId: 'card-1', groupId: 'group-999' },
        },
      ]),
    ).toBe(false);
  });

  it('accepts Card Review action suggestions only for the current session card', () => {
    const context = {
      contextType: 'card_review_session',
      languageId: 'es',
      allowedSuggestionTypes: ['add_inbox_note', 'pin_review_card', 'snooze_review_card', 'next_review_card'],
      selection: {
        groupIds: ['group-1'],
        limit: null,
        countMode: 'all_due',
      },
      initialTotalCount: 2,
      completedCount: 0,
      remainingCount: 2,
      currentCardNumber: 1,
      currentCard: {
        cardId: 'card-1',
        content: 'hablar',
        meaning: 'to speak',
        cardType: 'word',
        groupNames: ['Core'],
        examples: [],
        mnemonics: [],
        llmInstructions: null,
        nextDueAtIso: null,
        reviewCount: 2,
      },
      upcomingCards: [],
    } as Awaited<ReturnType<typeof resolveCanonicalChatContext>>;

    expect(
      areChatSuggestionsValidForContext(context, [
        { type: 'pin_review_card', payload: { cardId: 'card-1' } },
        { type: 'snooze_review_card', payload: { cardId: 'card-1' } },
        { type: 'next_review_card', payload: { cardId: 'card-1' } },
      ]),
    ).toBe(true);

    expect(
      areChatSuggestionsValidForContext(context, [
        { type: 'pin_review_card', payload: { cardId: 'card-2' } },
      ]),
    ).toBe(false);
  });
});
