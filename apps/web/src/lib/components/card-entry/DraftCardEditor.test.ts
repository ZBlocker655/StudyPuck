// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DraftCardEditor from './DraftCardEditor.svelte';
import { cardEntrySuggestionActions } from '$lib/stores/cardEntrySuggestionActions.js';
import type { CardEntryNoteDraftCardData } from '$lib/server/card-entry.js';

function createCard(overrides: Partial<CardEntryNoteDraftCardData> = {}): CardEntryNoteDraftCardData {
  return {
    cardId: 'card-1',
    content: '火车',
    meaning: 'train',
    cardType: 'word',
    partOfSpeech: null,
    examples: [],
    mnemonics: [],
    llmInstructions: null,
    linkedAtIso: null,
    groups: [],
    groupSuggestions: [],
    duplicateWarnings: [],
    ...overrides,
  };
}

describe('DraftCardEditor suggestion application', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('applies append-example suggestions through the normal draft-card save endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        card: createCard({ examples: ['我坐火车去上海。'] }),
        availableGroups: [],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(DraftCardEditor, {
      props: {
        lang: 'zh',
        noteId: 'note-1',
        card: createCard(),
        availableGroups: [],
      },
    });

    cardEntrySuggestionActions.applyAppendExampleSentence('note-1', 'card-1', '我坐火车去上海。');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/zh/card-entry/notes/note-1/draft-cards/card-1', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          content: '火车',
          meaning: 'train',
          examples: ['我坐火车去上海。'],
          mnemonics: [],
          llmInstructions: '',
          partOfSpeech: null,
          groups: [],
        }),
      });
    });

    expect(await screen.findByDisplayValue('我坐火车去上海。')).toBeTruthy();
  });

  it('surfaces save failures through the existing draft-card error state', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        message: 'The draft card could not be saved right now.',
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(DraftCardEditor, {
      props: {
        lang: 'zh',
        noteId: 'note-1',
        card: createCard(),
        availableGroups: [],
      },
    });

    cardEntrySuggestionActions.applyAppendExampleSentence('note-1', 'card-1', '我坐火车去上海。');

    expect(await screen.findByText('Save failed')).toBeTruthy();
    expect(screen.getByText('The draft card could not be saved right now.')).toBeTruthy();
  });

  it('applies append-mnemonic suggestions through the normal draft-card save endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        card: createCard({ mnemonics: ['Train tracks look like parallel rails carrying the word forward.'] }),
        availableGroups: [],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(DraftCardEditor, {
      props: {
        lang: 'zh',
        noteId: 'note-1',
        card: createCard(),
        availableGroups: [],
      },
    });

    cardEntrySuggestionActions.applyAppendMnemonic(
      'note-1',
      'card-1',
      'Train tracks look like parallel rails carrying the word forward.',
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/zh/card-entry/notes/note-1/draft-cards/card-1', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          content: '火车',
          meaning: 'train',
          examples: [],
          mnemonics: ['Train tracks look like parallel rails carrying the word forward.'],
          llmInstructions: '',
          partOfSpeech: null,
          groups: [],
        }),
      });
    });

    expect(await screen.findByDisplayValue('Train tracks look like parallel rails carrying the word forward.')).toBeTruthy();
  });

  it('creates a group from the typed query through the normal draft-card save endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        card: createCard({ groups: [{ groupId: 'group-9', groupName: 'Travel' }] }),
        availableGroups: [{ groupId: 'group-9', groupName: 'Travel' }],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(DraftCardEditor, {
      props: {
        lang: 'zh',
        noteId: 'note-1',
        card: createCard(),
        availableGroups: [],
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: '+ Add group' }));
    await fireEvent.input(screen.getByPlaceholderText('Search groups...'), {
      target: { value: 'Travel' },
    });
    await fireEvent.click(screen.getByRole('button', { name: '+ Create "Travel"' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/zh/card-entry/notes/note-1/draft-cards/card-1', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          content: '火车',
          meaning: 'train',
          examples: [],
          mnemonics: [],
          llmInstructions: '',
          partOfSpeech: null,
          groups: [{ groupId: null, groupName: 'Travel' }],
        }),
      });
    });
  });
});
