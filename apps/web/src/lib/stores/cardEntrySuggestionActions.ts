import { writable } from 'svelte/store';

export type AppendExampleSentenceAction = {
  actionId: number;
  noteId: string;
  cardId: string;
  text: string;
};

function createCardEntrySuggestionActionsStore() {
  const { subscribe, set } = writable<AppendExampleSentenceAction | null>(null);
  let actionCounter = 0;

  return {
    subscribe,
    applyAppendExampleSentence(noteId: string, cardId: string, text: string) {
      actionCounter += 1;
      set({
        actionId: actionCounter,
        noteId,
        cardId,
        text,
      });
    },
  };
}

export const cardEntrySuggestionActions = createCardEntrySuggestionActionsStore();
