import { writable } from 'svelte/store';

export type ActiveCardSuggestionAction = {
  actionId: number;
  cardId: string;
  suggestionType: 'append_example_sentence' | 'append_mnemonic';
  text: string;
};

function createActiveCardSuggestionActionsStore() {
  const { subscribe, set } = writable<ActiveCardSuggestionAction | null>(null);
  let actionCounter = 0;

  function dispatchSuggestion(
    cardId: string,
    suggestionType: ActiveCardSuggestionAction['suggestionType'],
    text: string,
  ) {
    actionCounter += 1;
    set({
      actionId: actionCounter,
      cardId,
      suggestionType,
      text,
    });
  }

  return {
    subscribe,
    applyAppendExampleSentence(cardId: string, text: string) {
      dispatchSuggestion(cardId, 'append_example_sentence', text);
    },
    applyAppendMnemonic(cardId: string, text: string) {
      dispatchSuggestion(cardId, 'append_mnemonic', text);
    },
  };
}

export const activeCardSuggestionActions = createActiveCardSuggestionActionsStore();
