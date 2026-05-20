// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TranslationDrillsHome from './TranslationDrillsHome.svelte';
import type { TranslationDrillContextCardData, TranslationDrillHomeData } from '$lib/server/translation-drills.js';

function createCard(overrides: Partial<TranslationDrillContextCardData> = {}): TranslationDrillContextCardData {
  return {
    cardId: 'card-1',
    content: '经历',
    meaning: 'experience',
    cardType: 'word',
    examples: [],
    mnemonics: [],
    llmInstructions: null,
    updatedAtIso: '2026-05-01T12:00:00.000Z',
    sourceGroup: { groupId: 'group-1', groupName: 'HSK2' },
    addedFrom: 'draw_pile:group-1',
    addedAtIso: '2026-05-09T12:00:00.000Z',
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
    ...overrides,
  };
}

function createHome(overrides: Partial<TranslationDrillHomeData> = {}): TranslationDrillHomeData {
  return {
    summary: {
      configuredGroupCount: 1,
      activeCardCount: 1,
      snoozedCardCount: 1,
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
      activeCards: [createCard()],
      snoozedCards: [createCard({
        cardId: 'card-2',
        content: '感觉',
        state: 'snoozed',
      })],
    }],
    ungroupedContextCards: [],
    challenge: {
      activeChallenge: null,
      generationInput: {
        activeCardCount: 1,
        cefrLevel: 'B1',
        cards: [createCard()],
        suggestedSourceCardIds: ['card-1'],
      },
    },
    ...overrides,
  };
}

describe('TranslationDrillsHome', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders grouped cards, snoozed rows, and draw-pile status', () => {
    render(TranslationDrillsHome, {
      props: {
        lang: 'zh',
        home: createHome(),
        loadError: null,
      },
    });

    expect(screen.getByRole('heading', { name: 'Context overview' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'HSK2' })).toBeTruthy();
    expect(screen.getByText('经历')).toBeTruthy();
    expect(screen.getByLabelText('感觉, snoozed')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'HSK2 draw pile — 2 cards remaining' })).toBeTruthy();
  });

  it('shows the empty-context overlay when no drill groups or cards are available', async () => {
    render(TranslationDrillsHome, {
      props: {
        lang: 'zh',
        home: createHome({
          summary: {
            configuredGroupCount: 0,
            activeCardCount: 0,
            snoozedCardCount: 0,
            dismissedCardCount: 0,
            disabledCardCount: 0,
            remainingDrawCount: 0,
            hasConfiguredDrawPiles: false,
            hasVisibleContext: false,
          },
          configuredGroups: [],
          availableGroups: [],
          ungroupedContextCards: [],
        }),
        loadError: null,
      },
    });

    expect(screen.getByRole('heading', { name: 'Add groups to start drilling' })).toBeTruthy();
    const learnMoreButton = screen.getByRole('button', { name: 'Learn more' });
    expect(learnMoreButton.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('link', { name: 'Go to Groups' }).getAttribute('href')).toBe('/zh/cards/groups');

    await fireEvent.click(learnMoreButton);

    expect(learnMoreButton.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(/Add groups, mark them as Translation Drills piles/)).toBeTruthy();
  });

  it('draws cards from a pile and updates the visible count', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        action: 'draw',
        message: 'Card drawn into Translation Drills.',
        card: createCard({
          cardId: 'card-3',
          content: '学习',
        }),
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(TranslationDrillsHome, {
      props: {
        lang: 'zh',
        home: createHome(),
        loadError: null,
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'HSK2 draw pile — 2 cards remaining' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/zh/translation-drills/actions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action: 'draw',
          groupId: 'group-1',
        }),
      });
    });

    expect(await screen.findByText('学习')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'HSK2 draw pile — 1 card remaining' })).toBeTruthy();
  });

  it('opens the dismiss dialog and removes the card after confirmation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        action: 'dismiss',
        cardId: 'card-1',
        state: 'dismissed',
        stateUntilIso: '2026-05-15T12:00:00.000Z',
        nextDueAtIso: '2026-05-15T12:00:00.000Z',
        intervalDays: 5,
        usageCount: 1,
        performanceScore: null,
        message: 'Card dismissed from the active context.',
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(TranslationDrillsHome, {
      props: {
        lang: 'zh',
        home: createHome(),
        loadError: null,
      },
    });

    await fireEvent.click(screen.getAllByRole('button', { name: '✕ Dismiss' })[0]);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByRole('heading', { name: '经历' })).toBeTruthy();
    expect(within(dialog).getByText('When should it return?')).toBeTruthy();

    await fireEvent.click(within(dialog).getByRole('button', { name: 'Dismiss' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/zh/translation-drills/actions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action: 'dismiss',
          cardId: 'card-1',
          returnInDays: 5,
        }),
      });
    });

    expect(await screen.findByText('经历 dismissed — returns in 5 days.')).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '💤 Snooze' })).toBeNull();
    });
  });

  it('shows Tomorrow first and keeps the recommended option selected in the dismiss dialog', async () => {
    const home = createHome();
    home.configuredGroups[0]!.activeCards = [createCard({
      dismissSchedule: {
        recommendedDays: 14,
        optionDays: [30, 14],
      },
    })];

    render(TranslationDrillsHome, {
      props: {
        lang: 'zh',
        home,
        loadError: null,
      },
    });

    await fireEvent.click(screen.getAllByRole('button', { name: '✕ Dismiss' })[0]);

    const dialog = screen.getByRole('dialog');
    const radios = within(dialog).getAllByRole('radio') as HTMLInputElement[];

    expect(radios.map((radio) => radio.value)).toEqual(['1', '14', '30']);
    expect(radios[0]?.closest('label')?.textContent).toContain('Tomorrow');
    expect(radios[1]?.checked).toBe(true);
    expect(radios[1]?.closest('label')?.textContent).toContain('Recommended');
  });

  it('opens card detail from the drill context and lets the user close the drawer', async () => {
    render(TranslationDrillsHome, {
      props: {
        lang: 'zh',
        home: createHome(),
        loadError: null,
      },
    });

    const activeCardRow = screen.getByLabelText('经历').closest('article');
    expect(activeCardRow).toBeTruthy();
    await fireEvent.click(within(activeCardRow as HTMLElement).getByRole('button', { name: 'More actions for 经历' }));
    await fireEvent.click(screen.getByRole('menuitem', { name: 'View card detail' }));

    const closeButton = await screen.findByRole('button', { name: 'Close drawer' });
    expect(closeButton.hasAttribute('disabled')).toBe(false);

    await fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Close drawer' })).toBeNull();
    });
  });

  it('keeps the drawer open when the home prop is refreshed with the same visible card', async () => {
    const view = render(TranslationDrillsHome, {
      props: {
        lang: 'zh',
        home: createHome(),
        loadError: null,
      },
    });

    const activeCardRow = screen.getByLabelText('经历').closest('article');
    expect(activeCardRow).toBeTruthy();
    await fireEvent.click(within(activeCardRow as HTMLElement).getByRole('button', { name: 'More actions for 经历' }));
    await fireEvent.click(screen.getByRole('menuitem', { name: 'View card detail' }));

    await screen.findByRole('button', { name: 'Close drawer' });

    await view.rerender({
      lang: 'zh',
      home: createHome(),
      loadError: null,
    });

    expect(screen.getByRole('button', { name: 'Close drawer' })).toBeTruthy();
  });
});
