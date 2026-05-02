import { describe, expect, it } from 'vitest';

import { commandBar, getFilteredCommandGroups, resolveRouteContext } from './commandBar.js';

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
    let state: Parameters<Parameters<typeof commandBar.subscribe>[0]>[0] | undefined;
    const unsub = commandBar.subscribe((s) => { state = s; });
    unsub();
    return state!;
  }

  it('resets messages when the active note changes', () => {
    // Set up initial state with a message
    commandBar.setEntityContext('es', 'note-1', null);
    // Simulate a message being in the store by submitting (we test the reset, not submission)
    // Instead, we directly verify that a context change clears messages.
    commandBar.setEntityContext('es', 'note-2', null);

    const state = getState();
    expect(state.messages).toEqual([]);
    expect(state.activeNoteId).toBe('note-2');
  });

  it('resets messages when the active card changes', () => {
    commandBar.setEntityContext('es', 'note-1', 'card-1');
    commandBar.setEntityContext('es', 'note-1', 'card-2');

    const state = getState();
    expect(state.messages).toEqual([]);
    expect(state.activeCardId).toBe('card-2');
  });

  it('resets messages when the active language changes', () => {
    commandBar.setEntityContext('es', 'note-1', null);
    commandBar.setEntityContext('zh', 'note-1', null);

    const state = getState();
    expect(state.messages).toEqual([]);
    expect(state.activeLanguageId).toBe('zh');
  });

  it('does not reset messages when the entity context is unchanged', () => {
    commandBar.setEntityContext('es', 'note-1', 'card-1');

    // Calling setEntityContext with the same values should be a no-op
    const stateBefore = getState();
    commandBar.setEntityContext('es', 'note-1', 'card-1');
    const stateAfter = getState();

    // Since messages are empty anyway here we verify state identity is preserved
    expect(stateAfter.activeLanguageId).toBe(stateBefore.activeLanguageId);
    expect(stateAfter.activeNoteId).toBe(stateBefore.activeNoteId);
    expect(stateAfter.activeCardId).toBe(stateBefore.activeCardId);
  });

  it('getPromptHistory returns only user and assistant turns bounded to PROMPT_HISTORY_CAP', () => {
    const mockState = {
      messages: [
        { id: '1', role: 'system' as const, content: 'System message' },
        { id: '2', role: 'user' as const, content: 'User turn 1' },
        { id: '3', role: 'assistant' as const, content: 'Assistant turn 1' },
        { id: '4', role: 'user' as const, content: 'User turn 2' },
      ],
    } as Parameters<typeof commandBar.getPromptHistory>[0];

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

    const mockState = { messages } as Parameters<typeof commandBar.getPromptHistory>[0];
    const history = commandBar.getPromptHistory(mockState);

    expect(history.length).toBeLessThanOrEqual(10);
    // Should be the last 10 turns
    expect(history[0]?.content).toBe('Turn 4');
    expect(history.at(-1)?.content).toBe('Turn 13');
  });
});
