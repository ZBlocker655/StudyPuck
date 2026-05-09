import { writable } from 'svelte/store';

export type ActiveCardSuggestionAction = {
  actionId: number;
  cardId: string;
} & (
  | {
      suggestionType: 'append_example_sentence' | 'append_mnemonic';
      text: string;
    }
  | {
      suggestionType: 'add_card_to_group' | 'remove_card_from_group';
      groupId: string;
    }
);

function createActiveCardSuggestionActionsStore() {
  const { subscribe, set } = writable<ActiveCardSuggestionAction | null>(null);
  let actionCounter = 0;

  function dispatchTextSuggestion(
    cardId: string,
    suggestionType: 'append_example_sentence' | 'append_mnemonic',
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

  function dispatchGroupSuggestion(
    cardId: string,
    suggestionType: 'add_card_to_group' | 'remove_card_from_group',
    groupId: string,
  ) {
    actionCounter += 1;
    set({
      actionId: actionCounter,
      cardId,
      suggestionType,
      groupId,
    });
  }

  return {
    subscribe,
    applyAppendExampleSentence(cardId: string, text: string) {
      dispatchTextSuggestion(cardId, 'append_example_sentence', text);
    },
    applyAppendMnemonic(cardId: string, text: string) {
      dispatchTextSuggestion(cardId, 'append_mnemonic', text);
    },
    applyAddCardToGroup(cardId: string, groupId: string) {
      dispatchGroupSuggestion(cardId, 'add_card_to_group', groupId);
    },
    applyRemoveCardFromGroup(cardId: string, groupId: string) {
      dispatchGroupSuggestion(cardId, 'remove_card_from_group', groupId);
    },
  };
}

export const activeCardSuggestionActions = createActiveCardSuggestionActionsStore();
