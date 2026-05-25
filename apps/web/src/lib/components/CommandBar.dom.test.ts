// @vitest-environment jsdom

import { createRawSnippet } from 'svelte';
import { writable } from 'svelte/store';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commandBar } from '$lib/stores/commandBar.js';
import { activeCardSuggestionActions } from '$lib/stores/activeCardSuggestionActions.js';
import { cardReviewSessionActions } from '$lib/stores/cardReviewSessionActions.js';
import { cardEntrySuggestionActions } from '$lib/stores/cardEntrySuggestionActions.js';
import { translationDrillSession } from '$lib/stores/translationDrillSession.js';
import { translationDrillSessionActions } from '$lib/stores/translationDrillSessionActions.js';

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

vi.mock('$app/environment', () => ({
  browser: true,
}));

const requestStructuredChatResponse = vi.fn();

vi.mock('$lib/chat/client.js', () => ({
  requestStructuredChatResponse,
}));

const createInboxNoteRequest = vi.fn();

vi.mock('$lib/card-entry/client.js', () => ({
  createInboxNoteRequest,
}));

function setMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: matches ? '(min-width: 64rem)' : '(max-width: 63.999rem)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as typeof window.matchMedia;
}

describe('CommandBar component behavior', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
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
    setMatchMedia(false);
    commandBar.setPathname('/zh/card-review');
    commandBar.setWorkspaceContext(null, null);
    commandBar.setTargetHint(null, null);
    commandBar.setSurfaceContext(null);
    translationDrillSession.reset();
    requestStructuredChatResponse.mockReset();
    createInboxNoteRequest.mockReset();
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
  }, 10000);

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

  it('posts create-group suggestions through the existing group action endpoint', async () => {
    pageStore.set({
      params: { lang: 'zh' },
      route: { id: '/[lang]/cards/groups' },
      status: 200,
      error: null,
      data: {},
      form: undefined,
      state: {},
      url: new URL('https://studypuck.test/zh/cards/groups'),
    });

    requestStructuredChatResponse.mockResolvedValue({
      message: 'I can create that group for you.',
      suggestions: [
        {
          type: 'create_group',
          payload: { name: 'Travel', description: 'Trips and transit' },
        },
      ],
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ group: { groupId: 'group-1', groupName: 'Travel', description: 'Trips and transit' } }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const { default: CommandBar } = await import('./CommandBar.svelte');
    const snippet = createRawSnippet(() => ({
      render: () => '<section>context content</section>',
    }));

    render(CommandBar, {
      props: {
        children: snippet,
      },
    });

    commandBar.setPathname('/zh/cards/groups');
    commandBar.setWorkspaceContext('zh', null);
    commandBar.setSurfaceContext({ surface: 'groups_list' });

    const textbox = screen.getByLabelText('Command bar');
    await fireEvent.input(textbox, { target: { value: 'Create a travel group' } });
    await fireEvent.keyDown(textbox, { key: 'Enter' });

    await screen.findAllByText('Travel');
    await fireEvent.click(screen.getAllByRole('button', { name: /Travel/ })[0]);

    expect(fetchMock).toHaveBeenCalledWith('/zh/cards/groups/actions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create',
        groupName: 'Travel',
        description: 'Trips and transit',
      }),
    });
  });

  it('creates active-language inbox notes through the existing note request helper', async () => {
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

    requestStructuredChatResponse.mockResolvedValue({
      message: 'That belongs in your inbox.',
      suggestions: [
        {
          type: 'add_inbox_note',
          payload: { text: 'Know when to use 谈论 vs 聊天' },
        },
      ],
    });
    createInboxNoteRequest.mockResolvedValue({ noteId: 'note-1' });

    const { default: CommandBar } = await import('./CommandBar.svelte');
    const snippet = createRawSnippet(() => ({
      render: () => '<section>context content</section>',
    }));

    render(CommandBar, {
      props: {
        children: snippet,
      },
    });

    commandBar.setPathname('/zh/card-review');
    commandBar.setWorkspaceContext('zh', null);

    const textbox = screen.getByLabelText('Command bar');
    await fireEvent.input(textbox, { target: { value: 'When would I use 谈论 vs 聊天?' } });
    await fireEvent.keyDown(textbox, { key: 'Enter' });

    expect(await screen.findAllByText('Know when to use 谈论 vs 聊天')).toHaveLength(2);
    expect(screen.getAllByText('Add inbox note')).toHaveLength(2);

    await fireEvent.click(screen.getAllByRole('button', { name: /Know when to use 谈论 vs 聊天/ })[0]);

    expect(createInboxNoteRequest).toHaveBeenCalledWith({
      languageId: 'zh',
      content: 'Know when to use 谈论 vs 聊天',
    });
  });

  it('forwards drawer add-to-group suggestions to the active card action store', async () => {
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
      message: 'I can add this card to Favorites.',
      suggestions: [
        {
          type: 'add_card_to_group',
          payload: { cardId: 'card-1', groupId: 'group-2' },
        },
      ],
    });

    const applySpy = vi.spyOn(activeCardSuggestionActions, 'applyAddCardToGroup');
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

    const textbox = screen.getByLabelText('Command bar');
    await fireEvent.input(textbox, { target: { value: 'Add this card to Favorites too' } });
    await fireEvent.keyDown(textbox, { key: 'Enter' });

    expect(await screen.findAllByText('Card card-1 -> Group group-2')).toHaveLength(2);
    await fireEvent.click(screen.getAllByRole('button', { name: /Card card-1 -> Group group-2/ })[0]);

    expect(applySpy).toHaveBeenCalledWith('card-1', 'group-2');
  });

  it('executes Card Review action suggestions through the session action store', async () => {
    pageStore.set({
      params: { lang: 'zh' },
      route: { id: '/[lang]/card-review/session' },
      status: 200,
      error: null,
      data: {},
      form: undefined,
      state: {},
      url: new URL('https://studypuck.test/zh/card-review/session'),
    });

    requestStructuredChatResponse.mockResolvedValue({
      message: 'You can just pin this one.',
      suggestions: [
        {
          type: 'pin_review_card',
          payload: { cardId: 'card-1' },
        },
      ],
    });

    const pinSpy = vi.spyOn(cardReviewSessionActions, 'requestPin').mockResolvedValue('Pinned to Translation Drills.');
    const { default: CommandBar } = await import('./CommandBar.svelte');
    const snippet = createRawSnippet(() => ({
      render: () => '<section>context content</section>',
    }));

    render(CommandBar, {
      props: {
        children: snippet,
      },
    });

    commandBar.setPathname('/zh/card-review/session');
    commandBar.setWorkspaceContext('zh', null);
    commandBar.setSurfaceContext({
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
    });

    const textbox = screen.getByLabelText('Command bar');
    await fireEvent.input(textbox, { target: { value: 'Pin this card for drills' } });
    await fireEvent.keyDown(textbox, { key: 'Enter' });

    expect(await screen.findAllByText('Pin card')).toHaveLength(2);
    await fireEvent.click(screen.getAllByRole('button', { name: /Pin card/i })[0]);

    expect(pinSpy).toHaveBeenCalledWith('card-1');
  });

  it('handles direct Card Review slash commands without calling the chat API', async () => {
    pageStore.set({
      params: { lang: 'zh' },
      route: { id: '/[lang]/card-review/session' },
      status: 200,
      error: null,
      data: {},
      form: undefined,
      state: {},
      url: new URL('https://studypuck.test/zh/card-review/session'),
    });

    const nextSpy = vi.spyOn(cardReviewSessionActions, 'requestNext').mockResolvedValue('Moved to the next card.');
    const { default: CommandBar } = await import('./CommandBar.svelte');
    const snippet = createRawSnippet(() => ({
      render: () => '<section>context content</section>',
    }));

    render(CommandBar, {
      props: {
        children: snippet,
      },
    });

    commandBar.setPathname('/zh/card-review/session');
    commandBar.setWorkspaceContext('zh', null);
    commandBar.setSurfaceContext({
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
    });

    const textbox = screen.getByLabelText('Command bar');
    await fireEvent.input(textbox, { target: { value: '/next' } });
    await fireEvent.keyDown(textbox, { key: 'Enter' });

    expect(await screen.findAllByText('Moved to the next card.')).toHaveLength(2);
    expect(nextSpy).toHaveBeenCalledWith('card-1');
    expect(requestStructuredChatResponse).not.toHaveBeenCalled();
  });

  it('executes Translation Drills action suggestions through the session action store', async () => {
    pageStore.set({
      params: { lang: 'zh' },
      route: { id: '/[lang]/translation-drills' },
      status: 200,
      error: null,
      data: {},
      form: undefined,
      state: {},
      url: new URL('https://studypuck.test/zh/translation-drills'),
    });

    requestStructuredChatResponse.mockResolvedValue({
      message: 'Draw another card from Core.',
      suggestions: [
        {
          type: 'draw_translation_drill_card',
          payload: { groupId: 'group-1' },
        },
      ],
    });

    const drawSpy = vi.spyOn(translationDrillSessionActions, 'requestDraw').mockResolvedValue({
      message: 'Card drawn into Translation Drills.',
    });
    const { default: CommandBar } = await import('./CommandBar.svelte');
    const snippet = createRawSnippet(() => ({
      render: () => '<section>context content</section>',
    }));

    render(CommandBar, {
      props: {
        children: snippet,
      },
    });

    commandBar.setPathname('/zh/translation-drills');
    commandBar.setWorkspaceContext('zh', null);
    commandBar.setSurfaceContext({
      surface: 'translation_drills',
      activeChallenge: null,
      focusedCardId: 'card-1',
    });

    const textbox = screen.getByLabelText('Command bar');
    await fireEvent.input(textbox, { target: { value: 'Draw another card from Core' } });
    await fireEvent.keyDown(textbox, { key: 'Enter' });

    expect(await screen.findAllByText('Draw card')).toHaveLength(1);
    await fireEvent.click(screen.getAllByRole('button', { name: /Draw from group-1/i })[0]);

    expect(drawSpy).toHaveBeenCalledWith('group-1');
  });

  it('handles direct Translation Drills slash commands without calling the chat API', async () => {
    pageStore.set({
      params: { lang: 'zh' },
      route: { id: '/[lang]/translation-drills' },
      status: 200,
      error: null,
      data: {},
      form: undefined,
      state: {},
      url: new URL('https://studypuck.test/zh/translation-drills'),
    });

    translationDrillSession.sync({
      lang: 'zh',
      home: {
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
        availableGroups: [{ groupId: 'group-1', groupName: 'Core' }],
        configuredGroups: [{
          groupId: 'group-1',
          groupName: 'Core',
          drawPileName: null,
          pileSizeLimit: 4,
          remainingCardCount: 2,
          activeCards: [{
            cardId: 'card-1',
            content: '谈论',
            meaning: 'to discuss',
            cardType: 'word',
            partOfSpeech: [],
            examples: [],
            mnemonics: [],
            llmInstructions: null,
            updatedAtIso: null,
            sourceGroup: { groupId: 'group-1', groupName: 'Core' },
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
            dismissSchedule: null,
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
              content: '谈论',
              meaning: 'to discuss',
              cardType: 'word',
              partOfSpeech: [],
              examples: [],
              mnemonics: [],
              llmInstructions: null,
              updatedAtIso: null,
              sourceGroup: { groupId: 'group-1', groupName: 'Core' },
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
              dismissSchedule: null,
            }],
            suggestedSourceCardIds: ['card-1'],
          },
        },
      },
      activeChallenge: null,
      focusedCardId: 'card-1',
    });

    const nextSpy = vi.spyOn(translationDrillSessionActions, 'requestNext').mockResolvedValue({
      message: 'New challenge ready.',
      conversationReset: true,
    });
    const { default: CommandBar } = await import('./CommandBar.svelte');
    const snippet = createRawSnippet(() => ({
      render: () => '<section>context content</section>',
    }));

    render(CommandBar, {
      props: {
        children: snippet,
      },
    });

    commandBar.setPathname('/zh/translation-drills');
    commandBar.setWorkspaceContext('zh', null);
    commandBar.setSurfaceContext({
      surface: 'translation_drills',
      activeChallenge: null,
      focusedCardId: 'card-1',
    });

    const textbox = screen.getByLabelText('Command bar');
    await fireEvent.input(textbox, { target: { value: '/next' } });
    await fireEvent.keyDown(textbox, { key: 'Enter' });

    await waitFor(() => {
      expect(nextSpy).toHaveBeenCalled();
    }, { timeout: 3000 });
    expect(nextSpy).toHaveBeenCalled();
    expect(requestStructuredChatResponse).not.toHaveBeenCalled();
  });

  it('renders Translation Drills challenge headers with the language display name', async () => {
    pageStore.set({
      params: { lang: 'zh' },
      route: { id: '/[lang]/translation-drills' },
      status: 200,
      error: null,
      data: {},
      form: undefined,
      state: {},
      url: new URL('https://studypuck.test/zh/translation-drills'),
    });

    translationDrillSession.sync({
      lang: 'zh',
      home: {
        summary: {
          configuredGroupCount: 1,
          activeCardCount: 1,
          snoozedCardCount: 0,
          dismissedCardCount: 0,
          disabledCardCount: 0,
          remainingDrawCount: 0,
          hasConfiguredDrawPiles: true,
          hasVisibleContext: true,
        },
        availableGroups: [{ groupId: 'group-1', groupName: 'Core' }],
        configuredGroups: [{
          groupId: 'group-1',
          groupName: 'Core',
          drawPileName: null,
          pileSizeLimit: 4,
          remainingCardCount: 0,
          activeCards: [{
            cardId: 'card-1',
            content: '谈论',
            meaning: 'to discuss',
            cardType: 'word',
            partOfSpeech: [],
            examples: [],
            mnemonics: [],
            llmInstructions: null,
            updatedAtIso: null,
            sourceGroup: { groupId: 'group-1', groupName: 'Core' },
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
            dismissSchedule: null,
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
              content: '谈论',
              meaning: 'to discuss',
              cardType: 'word',
              partOfSpeech: [],
              examples: [],
              mnemonics: [],
              llmInstructions: null,
              updatedAtIso: null,
              sourceGroup: { groupId: 'group-1', groupName: 'Core' },
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
              dismissSchedule: null,
            }],
            suggestedSourceCardIds: ['card-1'],
          },
        },
      },
      activeChallenge: {
        challengeId: 'challenge-1',
        prompt: 'That is all.',
        sourceCardIds: ['card-1'],
        startedAtIso: '2026-05-16T00:00:00.000Z',
      },
      focusedCardId: null,
    });

    const { default: CommandBar } = await import('./CommandBar.svelte');
    const snippet = createRawSnippet(() => ({
      render: () => '<section>context content</section>',
    }));

    render(CommandBar, {
      props: {
        children: snippet,
      },
    });

    commandBar.setPathname('/zh/translation-drills');
    commandBar.setWorkspaceContext('zh', null);
    commandBar.setSurfaceContext({
      surface: 'translation_drills',
      activeChallenge: {
        challengeId: 'challenge-1',
        prompt: 'That is all.',
        sourceCardIds: ['card-1'],
        startedAtIso: '2026-05-16T00:00:00.000Z',
      },
      focusedCardId: null,
    });

    expect(screen.getByText('Translate to Chinese (Mandarin)')).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Challenge focus cards' })).toBeNull();
  });

  it('shows a conversation-first Translation Drills mobile shell and opens cards in a bottom sheet', async () => {
    pageStore.set({
      params: { lang: 'zh' },
      route: { id: '/[lang]/translation-drills' },
      status: 200,
      error: null,
      data: {},
      form: undefined,
      state: {},
      url: new URL('https://studypuck.test/zh/translation-drills'),
    });

    const { default: CommandBar } = await import('./CommandBar.svelte');
    const snippet = createRawSnippet(() => ({
      render: () => '<section><h2>Mobile cards context</h2></section>',
    }));

    render(CommandBar, {
      props: {
        children: snippet,
      },
    });

    commandBar.setPathname('/zh/translation-drills');
    commandBar.setWorkspaceContext('zh', null);
    commandBar.setSurfaceContext({
      surface: 'translation_drills',
      activeChallenge: null,
      focusedCardId: null,
    });

    expect(screen.getByRole('button', { name: 'Open cards view' })).toBeTruthy();
    expect(screen.queryByLabelText('Cards sheet')).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Open cards view' }));

    const cardsSheet = screen.getByLabelText('Cards sheet');
    expect(cardsSheet).toBeTruthy();
    expect(within(cardsSheet).getByText('Mobile cards context')).toBeTruthy();
  });

  it('collapses the Translation Drills context pane on desktop for active recall', async () => {
    setMatchMedia(true);
    pageStore.set({
      params: { lang: 'zh' },
      route: { id: '/[lang]/translation-drills' },
      status: 200,
      error: null,
      data: {},
      form: undefined,
      state: {},
      url: new URL('https://studypuck.test/zh/translation-drills'),
    });

    const { default: CommandBar } = await import('./CommandBar.svelte');
    const snippet = createRawSnippet(() => ({
      render: () => '<section><h2>Desktop cards context</h2></section>',
    }));

    render(CommandBar, {
      props: {
        children: snippet,
      },
    });

    commandBar.setPathname('/zh/translation-drills');
    commandBar.setWorkspaceContext('zh', null);
    commandBar.setSurfaceContext({
      surface: 'translation_drills',
      activeChallenge: null,
      focusedCardId: null,
    });

    expect(screen.getByText('Desktop cards context')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Collapse cards view' })).toBeTruthy();
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Collapse cards view' }));

    expect(screen.queryByText('Desktop cards context')).toBeNull();

    await fireEvent.click(screen.getAllByRole('button', { name: 'Open cards view' })[0]!);

    expect(screen.getByText('Desktop cards context')).toBeTruthy();
  });
});
