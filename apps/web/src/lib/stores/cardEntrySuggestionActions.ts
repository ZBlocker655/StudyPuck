import { writable } from 'svelte/store';

export type CardEntrySuggestionAction = {
  actionId: number;
  noteId: string;
  cardId: string;
  suggestionType: 'append_example_sentence' | 'append_mnemonic';
  text: string;
};

function createCardEntrySuggestionActionsStore() {
  const { subscribe, set } = writable<CardEntrySuggestionAction | null>(null);
  let actionCounter = 0;

  function dispatchSuggestion(
    noteId: string,
    cardId: string,
    suggestionType: CardEntrySuggestionAction['suggestionType'],
    text: string,
  ) {
    actionCounter += 1;
    set({
      actionId: actionCounter,
      noteId,
      cardId,
      suggestionType,
      text,
    });
  }

  return {
    subscribe,
    applyAppendExampleSentence(noteId: string, cardId: string, text: string) {
      dispatchSuggestion(noteId, cardId, 'append_example_sentence', text);
    },
    applyAppendMnemonic(noteId: string, cardId: string, text: string) {
      dispatchSuggestion(noteId, cardId, 'append_mnemonic', text);
    },
  };
}

export const cardEntrySuggestionActions = createCardEntrySuggestionActionsStore();
