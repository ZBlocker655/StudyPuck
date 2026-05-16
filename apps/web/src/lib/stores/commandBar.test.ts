import { describe, expect, it, vi } from 'vitest';

import { commandBar, getFilteredCommandGroups, resolveRouteContext, type CommandBarState } from './commandBar.js';

describe('commandBar route context', () => {
  it('maps language-prefixed mini-app routes to the correct command context', () => {
    expect(resolveRouteContext('/zh/card-review')).toMatchObject({
      commandContext: 'card-review',
      label: 'Card Review',
    });
    expect(resolveRouteContext('/zh/card-entry')).toMatchObject({
      commandContext: 'card-entry',
      label: 'Card Entry',
    });
    expect(resolveRouteContext('/zh/translation-drills')).toMatchObject({
      commandContext: 'translation-drills',
      label: 'Translation Drills',
    });
  });

  it('distinguishes Card Library list, Groups list, and Group Detail routes', () => {
    expect(resolveRouteContext('/zh/cards')).toMatchObject({
      routeContextType: 'card_library_list',
      label: 'Cards',
    });
    expect(resolveRouteContext('/zh/cards/groups')).toMatchObject({
      routeContextType: 'groups_list',
      label: 'Groups',
    });
    expect(resolveRouteContext('/zh/cards/groups/group-1')).toMatchObject({
      routeContextType: 'group_detail',
      label: 'Group Detail',
    });
  });

  it('keeps dashboard and settings in the global command context', () => {
    expect(resolveRouteContext('/zh')).toMatchObject({
      commandContext: 'global',
      label: 'Dashboard',
    });
    expect(resolveRouteContext('/zh/settings')).toMatchObject({
      commandContext: 'global',
      label: 'Settings',
    });
  });
});

describe('commandBar command filtering', () => {
  it('shows context commands before global commands when the command list is open', () => {
    const groups = getFilteredCommandGroups('card-review', '/');

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      label: 'Current context',
    });
    expect(groups[0].commands.map((command) => command.command)).toEqual(['/pin', '/snooze', '/next']);
    expect(groups[1]).toMatchObject({
      label: 'Global',
    });
    expect(groups[1].commands.map((command) => command.command)).toEqual(['/add', '/lang', '/help']);
  });

  it('includes Translation Drills slash commands in the Translation Drills context', () => {
    const groups = getFilteredCommandGroups('translation-drills', '/');

    expect(groups[0]?.commands.map((command) => command.command)).toEqual([
      '/next',
      '/snooze',
      '/dismiss',
      '/draw',
      '/context',
    ]);
  });

  it('does not duplicate a global-only group when already in the global context', () => {
    const groups = getFilteredCommandGroups('global', '/h');

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      label: 'Global',
    });
    expect(groups[0].commands.map((command) => command.command)).toEqual(['/help']);
  });
});

describe('commandBar entity context and conversation reset', () => {
  function getState() {
    let state: CommandBarState | undefined;
    const unsub = commandBar.subscribe((s) => { state = s; });
    unsub();
    return state!;
  }

  it('resets messages when the active note changes', () => {
    // Set the workspace to note-1 then immediately switch to note-2;
    // the messages array should be empty after the switch.
    commandBar.setWorkspaceContext('es', 'note-1');
    commandBar.setWorkspaceContext('es', 'note-2');

    const state = getState();
    expect(state.messages).toEqual([]);
    expect(state.activeNoteId).toBe('note-2');
  });

  it('does not reset messages when the target card hint changes within one note workspace', () => {
    commandBar.setWorkspaceContext('es', 'note-1');
    commandBar.pushAssistantMessage('Existing conversation');
    commandBar.setTargetHint('card-1', 'examples');
    commandBar.setTargetHint('card-2', 'meaning');

    const state = getState();
    expect(state.messages).toHaveLength(1);
    expect(state.activeCardId).toBe('card-2');
    expect(state.activeFocusedField).toBe('meaning');
  });

  it('resets messages when the active language changes', () => {
    commandBar.setWorkspaceContext('es', 'note-1');
    commandBar.setWorkspaceContext('zh', 'note-1');

    const state = getState();
    expect(state.messages).toEqual([]);
    expect(state.activeLanguageId).toBe('zh');
  });

  it('does not reset messages when the workspace context is unchanged', () => {
    commandBar.setWorkspaceContext('es', 'note-1');
    commandBar.setTargetHint('card-1', 'examples');

    // Calling setWorkspaceContext / setTargetHint with the same values should be a no-op
    const stateBefore = getState();
    commandBar.setWorkspaceContext('es', 'note-1');
    commandBar.setTargetHint('card-1', 'examples');
    const stateAfter = getState();

    expect(stateAfter.activeLanguageId).toBe(stateBefore.activeLanguageId);
    expect(stateAfter.activeNoteId).toBe(stateBefore.activeNoteId);
    expect(stateAfter.activeCardId).toBe(stateBefore.activeCardId);
    expect(stateAfter.activeFocusedField).toBe(stateBefore.activeFocusedField);
  });

  it('resets messages when the card-library surface scope changes', () => {
    commandBar.setWorkspaceContext('es', null);
    commandBar.setSurfaceContext({
      surface: 'card_library_list',
      filters: { searchText: '', groupIds: [], cardType: null },
      selectedCardIds: [],
    });
    commandBar.pushAssistantMessage('Existing conversation');
    commandBar.setSurfaceContext({
      surface: 'group_detail',
      groupId: 'group-1',
      filters: { searchText: '', cardType: null },
      selectedCardIds: [],
    });

    const state = getState();
    expect(state.messages).toEqual([]);
    expect(state.surfaceContextHint).toMatchObject({
      surface: 'group_detail',
      groupId: 'group-1',
    });
  });

  it('keeps messages when only card-library filter inputs change within one surface', () => {
    commandBar.setWorkspaceContext('es', null);
    commandBar.setSurfaceContext({
      surface: 'card_library_list',
      filters: { searchText: '', groupIds: [], cardType: null },
      selectedCardIds: [],
    });
    commandBar.pushAssistantMessage('Existing conversation');
    commandBar.setSurfaceContext({
      surface: 'card_library_list',
      filters: { searchText: 'hola', groupIds: [], cardType: null },
      selectedCardIds: ['card-1'],
    });

    const state = getState();
    expect(state.messages).toHaveLength(1);
    expect(state.surfaceContextHint).toMatchObject({
      surface: 'card_library_list',
      filters: { searchText: 'hola' },
      selectedCardIds: ['card-1'],
    });
  });

  it('resets messages when the active card drawer changes to a different card', () => {
    commandBar.setWorkspaceContext('es', null);
    commandBar.setSurfaceContext({
      surface: 'card_detail_drawer',
      sourceSurface: 'card_library_list',
      cardId: 'card-1',
    });
    commandBar.pushAssistantMessage('Existing conversation');
    commandBar.setSurfaceContext({
      surface: 'card_detail_drawer',
      sourceSurface: 'card_library_list',
      cardId: 'card-2',
    });

    const state = getState();
    expect(state.messages).toEqual([]);
    expect(state.surfaceContextHint).toMatchObject({
      surface: 'card_detail_drawer',
      cardId: 'card-2',
    });
  });

  it('resets messages when Card Review moves from setup into an active session', () => {
    commandBar.setWorkspaceContext('es', null);
    commandBar.setSurfaceContext({
      surface: 'card_review_setup',
      selection: {
        groupIds: ['group-1'],
        limit: null,
        countMode: 'all_due',
      },
    });
    commandBar.pushAssistantMessage('Existing conversation');
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

    const state = getState();
    expect(state.messages).toEqual([]);
    expect(state.surfaceContextHint).toMatchObject({
      surface: 'card_review_session',
      currentCardId: 'card-1',
    });
  });

  it('resets messages when the active Card Review session card changes', () => {
    commandBar.setWorkspaceContext('es', null);
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
    commandBar.pushAssistantMessage('Existing conversation');
    commandBar.setSurfaceContext({
      surface: 'card_review_session',
      selection: {
        groupIds: ['group-1'],
        limit: null,
        countMode: 'all_due',
      },
      queueCardIds: ['card-2', 'card-1'],
      currentCardId: 'card-2',
      initialTotalCount: 2,
      completedCount: 0,
    });

    const state = getState();
    expect(state.messages).toEqual([]);
    expect(state.surfaceContextHint).toMatchObject({
      surface: 'card_review_session',
      currentCardId: 'card-2',
    });
  });

  it('keeps messages when the active Translation Drills challenge changes within the same surface', () => {
    commandBar.setWorkspaceContext('es', null);
    commandBar.setSurfaceContext({
      surface: 'translation_drills',
      activeChallenge: null,
      focusedCardId: 'card-1',
    });
    commandBar.pushAssistantMessage('Existing conversation');
    commandBar.setSurfaceContext({
      surface: 'translation_drills',
      activeChallenge: {
        challengeId: 'challenge-1',
        prompt: 'I want to speak more clearly today.',
        sourceCardIds: ['card-1'],
        startedAtIso: '2026-05-10T12:00:00.000Z',
      },
      focusedCardId: 'card-1',
    });

    const state = getState();
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toMatchObject({
      role: 'assistant',
      content: 'Existing conversation',
    });
    expect(state.surfaceContextHint).toMatchObject({
      surface: 'translation_drills',
      activeChallenge: {
        challengeId: 'challenge-1',
      },
    });
  });

  it('getPromptHistory returns only user and assistant turns bounded to PROMPT_HISTORY_CAP', () => {
    const mockState = {
      messages: [
        { id: '1', role: 'system' as const, content: 'System message' },
        { id: '2', role: 'user' as const, content: 'User turn 1' },
        { id: '3', role: 'assistant' as const, content: 'Assistant turn 1' },
        { id: '4', role: 'user' as const, content: 'User turn 2' },
      ],
    } as CommandBarState;

    const history = commandBar.getPromptHistory(mockState);

    // System messages should be excluded
    expect(history).not.toContainEqual(expect.objectContaining({ content: 'System message' }));
    expect(history).toEqual([
      { role: 'user', content: 'User turn 1' },
      { role: 'assistant', content: 'Assistant turn 1' },
      { role: 'user', content: 'User turn 2' },
    ]);
  });

  it('getPromptHistory caps output to PROMPT_HISTORY_CAP turns', () => {
    // Build a state with more messages than the cap (10)
    const messages = Array.from({ length: 14 }, (_, i) => ({
      id: String(i),
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Turn ${i}`,
    }));

    const mockState = { messages } as CommandBarState;
    const history = commandBar.getPromptHistory(mockState);

    expect(history.length).toBeLessThanOrEqual(10);
    // Should be the last 10 turns
    expect(history[0]?.content).toBe('Turn 4');
    expect(history.at(-1)?.content).toBe('Turn 13');
  });
});

describe('commandBar structured chat response handling', () => {
  function getState() {
    let state: CommandBarState | undefined;
    const unsub = commandBar.subscribe((s) => { state = s; });
    unsub();
    return state!;
  }

  it('stores suggestions from a ChatResponse in the assistant message', async () => {
    vi.useFakeTimers();

    const suggestion = {
      type: 'append_example_sentence' as const,
      payload: { cardId: 'card-1', text: '我坐火车去上海。' },
    };

    const responder = async () => ({
      message: 'Here is an example sentence.',
      suggestions: [suggestion],
    });

    commandBar.setWorkspaceContext('zh', 'note-1');
    commandBar.setTargetHint('card-1', 'examples');
    commandBar.setInput('Give me example sentences');
    commandBar.submit(responder);

    // Advance timers past the 650ms submit delay then flush async work
    await vi.runAllTimersAsync();
    vi.useRealTimers();

    const state = getState();
    const lastMessage = state.messages.at(-1);

    expect(lastMessage?.role).toBe('assistant');
    expect(lastMessage?.content).toBe('Here is an example sentence.');
    expect(lastMessage?.suggestions).toEqual([suggestion]);
  });

  it('stores empty suggestions for plain-string responder responses', async () => {
    vi.useFakeTimers();

    const responder = async () => 'A plain text response.';

    commandBar.setWorkspaceContext('zh', 'note-2');
    commandBar.setTargetHint('card-2', 'examples');
    commandBar.setInput('How does this work?');
    commandBar.submit(responder);

    await vi.runAllTimersAsync();
    vi.useRealTimers();

    const state = getState();
    const lastMessage = state.messages.at(-1);

    expect(lastMessage?.role).toBe('assistant');
    expect(lastMessage?.content).toBe('A plain text response.');
    expect(lastMessage?.suggestions).toEqual([]);
  });

  it('getPromptHistory uses message content, not suggestions, for history turns', () => {
    const mockState = {
      messages: [
        { id: '1', role: 'user' as const, content: 'Give me examples', suggestions: [] },
        {
          id: '2',
          role: 'assistant' as const,
          content: 'Here is an example.',
          suggestions: [{ type: 'append_example_sentence' as const, payload: { cardId: 'card-1', text: '我坐火车去上海。' } }],
        },
      ],
    } as CommandBarState;

    const history = commandBar.getPromptHistory(mockState);

    expect(history).toEqual([
      { role: 'user', content: 'Give me examples' },
      { role: 'assistant', content: 'Here is an example.' },
    ]);
  });
});
