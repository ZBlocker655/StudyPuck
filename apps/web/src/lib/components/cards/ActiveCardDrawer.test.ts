// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ActiveCardDrawer from './ActiveCardDrawer.svelte';
import { activeCardSuggestionActions } from '$lib/stores/activeCardSuggestionActions.js';
import type { CardLibraryCardDetailData, CardLibraryGroupData } from '$lib/server/cards.js';

function createCard(overrides: Partial<CardLibraryCardDetailData> = {}): CardLibraryCardDetailData {
  return {
    cardId: 'card-1',
    content: '谈论',
    meaning: 'to discuss',
    cardType: 'pattern',
    examples: [],
    mnemonics: [],
    llmInstructions: null,
    updatedAtIso: '2026-05-01T12:00:00.000Z',
    groups: [],
    ...overrides,
  };
}

function createGroup(overrides: Partial<CardLibraryGroupData> = {}): CardLibraryGroupData {
  return {
    groupId: 'group-1',
    groupName: 'Conversation',
    ...overrides,
  };
}

describe('ActiveCardDrawer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('saves edited card content through the active-card PATCH endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        card: createCard({ meaning: 'to talk about in a more formal register' }),
        availableGroups: [createGroup()],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(ActiveCardDrawer, {
      props: {
        lang: 'zh',
        card: createCard(),
        availableGroups: [createGroup()],
        selectedIndex: 0,
        totalCount: 1,
      },
    });

    const meaningField = screen.getByDisplayValue('to discuss');
    await fireEvent.input(meaningField, {
      currentTarget: {
        value: 'to talk about in a more formal register',
      },
      target: {
        value: 'to talk about in a more formal register',
      },
    });
    await fireEvent.blur(meaningField);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/zh/cards/card-1', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          content: '谈论',
          meaning: 'to talk about in a more formal register',
          examples: [],
          mnemonics: [],
          llmInstructions: '',
          groups: [],
        }),
      });
    });

    expect(await screen.findByText('Saved ✓')).toBeTruthy();
  });

  it('requires confirmation before deleting and emits the deleted event after success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        deletedCardIds: ['card-1'],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(ActiveCardDrawer, {
      props: {
        lang: 'zh',
        card: createCard(),
        availableGroups: [],
        selectedIndex: 0,
        totalCount: 1,
      },
    });

    await fireEvent.click(screen.getAllByRole('button', { name: 'Delete card' })[0]);
    expect(screen.getByText('Delete "谈论"?')).toBeTruthy();

    await fireEvent.click(screen.getAllByRole('button', { name: 'Delete card' })[1]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/zh/cards/card-1', {
        method: 'DELETE',
      });
    });
  });

  it('hides delete controls when delete is not allowed', () => {
    render(ActiveCardDrawer, {
      props: {
        lang: 'zh',
        card: createCard(),
        availableGroups: [],
        selectedIndex: 0,
        totalCount: 1,
        allowDelete: false,
      },
    });

    expect(screen.queryByRole('button', { name: 'Delete card' })).toBeNull();
  });

  it('applies append-mnemonic suggestions through the active-card PATCH endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        card: createCard({ mnemonics: ['Imagine two people talking while a memory hook keeps the phrase anchored.'] }),
        availableGroups: [createGroup()],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(ActiveCardDrawer, {
      props: {
        lang: 'zh',
        card: createCard(),
        availableGroups: [createGroup()],
        selectedIndex: 0,
        totalCount: 1,
      },
    });

    activeCardSuggestionActions.applyAppendMnemonic(
      'card-1',
      'Imagine two people talking while a memory hook keeps the phrase anchored.',
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/zh/cards/card-1', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          content: '谈论',
          meaning: 'to discuss',
          examples: [],
          mnemonics: ['Imagine two people talking while a memory hook keeps the phrase anchored.'],
          llmInstructions: '',
          groups: [],
        }),
      });
    });

    expect(await screen.findByDisplayValue('Imagine two people talking while a memory hook keeps the phrase anchored.')).toBeTruthy();
  });

  it('applies add-card-to-group suggestions through the active-card PATCH endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        card: createCard({ groups: [createGroup()] }),
        availableGroups: [createGroup(), createGroup({ groupId: 'group-2', groupName: 'Favorites' })],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(ActiveCardDrawer, {
      props: {
        lang: 'zh',
        card: createCard(),
        availableGroups: [createGroup(), createGroup({ groupId: 'group-2', groupName: 'Favorites' })],
        selectedIndex: 0,
        totalCount: 1,
      },
    });

    activeCardSuggestionActions.applyAddCardToGroup('card-1', 'group-1');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/zh/cards/card-1', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          content: '谈论',
          meaning: 'to discuss',
          examples: [],
          mnemonics: [],
          llmInstructions: '',
          groups: [{ groupId: 'group-1', groupName: 'Conversation' }],
        }),
      });
    });
  });

  it('applies remove-card-from-group suggestions through the active-card PATCH endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        card: createCard({ groups: [] }),
        availableGroups: [createGroup()],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(ActiveCardDrawer, {
      props: {
        lang: 'zh',
        card: createCard({ groups: [createGroup()] }),
        availableGroups: [createGroup()],
        selectedIndex: 0,
        totalCount: 1,
      },
    });

    activeCardSuggestionActions.applyRemoveCardFromGroup('card-1', 'group-1');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/zh/cards/card-1', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          content: '谈论',
          meaning: 'to discuss',
          examples: [],
          mnemonics: [],
          llmInstructions: '',
          groups: [],
        }),
      });
    });
  });

  it('creates a group from the typed query through the active-card PATCH endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        card: createCard({ groups: [{ groupId: 'group-9', groupName: 'Travel' }] }),
        availableGroups: [{ groupId: 'group-9', groupName: 'Travel' }],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(ActiveCardDrawer, {
      props: {
        lang: 'zh',
        card: createCard(),
        availableGroups: [],
        selectedIndex: 0,
        totalCount: 1,
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: '+ Add group' }));
    await fireEvent.input(screen.getByPlaceholderText('Search groups...'), {
      target: { value: 'Travel' },
    });
    await fireEvent.click(screen.getByRole('button', { name: '+ Create "Travel"' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/zh/cards/card-1', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          content: '谈论',
          meaning: 'to discuss',
          examples: [],
          mnemonics: [],
          llmInstructions: '',
          groups: [{ groupId: null, groupName: 'Travel' }],
        }),
      });
    });
  });
});
