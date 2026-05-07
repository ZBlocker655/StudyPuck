// @vitest-environment jsdom

import { createRawSnippet } from 'svelte';
import { writable } from 'svelte/store';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commandBar } from '$lib/stores/commandBar.js';
import { activeCardSuggestionActions } from '$lib/stores/activeCardSuggestionActions.js';
import { cardEntrySuggestionActions } from '$lib/stores/cardEntrySuggestionActions.js';

type MockPageStoreValue = {
  params: { lang: string; noteId?: string };
  route: { id: string };
  status: number;
  error: null;
  data: Record<string, never>;
  form: undefined;
  state: Record<string, never>;
  url: URL;
};

const pageStore = writable<MockPageStoreValue>({
  params: { lang: 'zh' },
  route: { id: '/[lang]/card-review' },
  status: 200,
  error: null,
  data: {},
  form: undefined,
  state: {},
  url: new URL('https://studypuck.test/zh/card-review'),
});

vi.mock('$app/stores', () => ({
  page: pageStore,
}));

const requestStructuredChatResponse = vi.fn();

vi.mock('$lib/chat/client.js', () => ({
  requestStructuredChatResponse,
}));

describe('CommandBar component behavior', () => {
  beforeEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    pageStore.set({
      params: { lang: 'zh' },
      route: { id: '/[lang]/card-review' },
      status: 200,
      error: null,
      data: {},
      form: undefined,
      state: {},
      url: new URL('https://studypuck.test/zh/card-review'),
    });
    commandBar.setPathname('/zh/card-review');
    commandBar.setWorkspaceContext(null, null);
    commandBar.setTargetHint(null, null);
    commandBar.setSurfaceContext(null);
    requestStructuredChatResponse.mockReset();
  });

  it('opens command autocomplete for slash input and shows the current context', async () => {
    const { default: CommandBar } = await import('./CommandBar.svelte');

    const snippet = createRawSnippet(() => ({
      render: () => '<section>context content</section>',
    }));

    render(CommandBar, {
      props: {
        children: snippet,
      },
    });

    const contextBlock = document.querySelector('.command-bar__context');
    expect(contextBlock).not.toBeNull();
    expect(within(contextBlock as HTMLElement).getByText('Card Review')).toBeTruthy();

    const textbox = screen.getByLabelText('Command bar');
    await fireEvent.input(textbox, { target: { value: '/n' } });

    expect(screen.getByText('/next')).toBeTruthy();
    expect(screen.getByText('Move to the next card in the current review session.')).toBeTruthy();
  });

  it('renders suggestion text and forwards apply clicks to the active draft card', async () => {
    pageStore.set({
      params: { lang: 'zh', noteId: 'note-1' },
      route: { id: '/[lang]/card-entry/notes/[noteId]' },
      status: 200,
      error: null,
      data: {},
      form: undefined,
      state: {},
      url: new URL('https://studypuck.test/zh/card-entry/notes/note-1'),
    });

    requestStructuredChatResponse.mockResolvedValue({
      message: 'Here are three examples.',
      suggestions: [
        {
          type: 'append_example_sentence',
          payload: { cardId: 'card-1', text: '我坐火车去上海。' },
        },
      ],
    });

    const applySpy = vi.spyOn(cardEntrySuggestionActions, 'applyAppendExampleSentence');
    const { default: CommandBar } = await import('./CommandBar.svelte');

    const snippet = createRawSnippet(() => ({
      render: () => '<section>context content</section>',
    }));

    render(CommandBar, {
      props: {
        children: snippet,
      },
    });

    commandBar.setPathname('/zh/card-entry/notes/note-1');
    commandBar.setWorkspaceContext('zh', 'note-1');
    commandBar.setTargetHint('card-1', 'examples');

    const textbox = screen.getByLabelText('Command bar');
    await fireEvent.input(textbox, { target: { value: 'Give me another example sentence' } });
    await fireEvent.keyDown(textbox, { key: 'Enter' });

    expect(await screen.findAllByText('我坐火车去上海。')).toHaveLength(2);
    expect(screen.getAllByText('Add to examples')).toHaveLength(2);
    expect(requestStructuredChatResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        noteId: 'note-1',
        cardId: 'card-1',
        focusedField: 'examples',
      }),
    );

    await fireEvent.click(screen.getAllByRole('button', { name: /我坐火车去上海。/ })[0]);

    expect(applySpy).toHaveBeenCalledWith('note-1', 'card-1', '我坐火车去上海。');
  });

  it('forwards mnemonic suggestions to the active card drawer action store', async () => {
    pageStore.set({
      params: { lang: 'zh' },
      route: { id: '/[lang]/cards' },
      status: 200,
      error: null,
      data: {},
      form: undefined,
      state: {},
      url: new URL('https://studypuck.test/zh/cards'),
    });

    requestStructuredChatResponse.mockResolvedValue({
      message: 'Here is a mnemonic.',
      suggestions: [
        {
          type: 'append_mnemonic',
          payload: { cardId: 'card-1', text: 'Imagine talking while a memory hook keeps the phrase anchored.' },
        },
      ],
    });

    const applySpy = vi.spyOn(activeCardSuggestionActions, 'applyAppendMnemonic');
    const { default: CommandBar } = await import('./CommandBar.svelte');

    const snippet = createRawSnippet(() => ({
      render: () => '<section>context content</section>',
    }));

    render(CommandBar, {
      props: {
        children: snippet,
      },
    });

    commandBar.setPathname('/zh/cards');
    commandBar.setWorkspaceContext('zh', null);
    commandBar.setSurfaceContext({
      surface: 'card_detail_drawer',
      sourceSurface: 'card_library_list',
      cardId: 'card-1',
    });
    commandBar.setTargetHint('card-1', 'mnemonics');

    const textbox = screen.getByLabelText('Command bar');
    await fireEvent.input(textbox, { target: { value: 'Give me a mnemonic' } });
    await fireEvent.keyDown(textbox, { key: 'Enter' });

    expect(await screen.findAllByText('Imagine talking while a memory hook keeps the phrase anchored.')).toHaveLength(2);
    expect(screen.getAllByText('Add to mnemonics')).toHaveLength(2);

    await fireEvent.click(
      screen.getAllByRole('button', { name: /Imagine talking while a memory hook keeps the phrase anchored\./ })[0],
    );

    expect(applySpy).toHaveBeenCalledWith(
      'card-1',
      'Imagine talking while a memory hook keeps the phrase anchored.',
    );
  });
});
