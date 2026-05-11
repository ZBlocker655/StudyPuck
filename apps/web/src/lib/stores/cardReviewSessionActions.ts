import { writable } from 'svelte/store';

export type CardReviewSessionActionRequest = {
  actionId: number;
  action: 'pin' | 'snooze' | 'next';
  cardId: string;
  resolve: (message: string) => void;
  reject: (error: Error) => void;
};

function createCardReviewSessionActionsStore() {
  const { subscribe, set } = writable<CardReviewSessionActionRequest | null>(null);
  let actionCounter = 0;

  function dispatch(action: CardReviewSessionActionRequest['action'], cardId: string) {
    actionCounter += 1;

    return new Promise<string>((resolve, reject) => {
      set({
        actionId: actionCounter,
        action,
        cardId,
        resolve,
        reject,
      });
    });
  }

  return {
    subscribe,
    requestPin(cardId: string) {
      return dispatch('pin', cardId);
    },
    requestSnooze(cardId: string) {
      return dispatch('snooze', cardId);
    },
    requestNext(cardId: string) {
      return dispatch('next', cardId);
    },
  };
}

export const cardReviewSessionActions = createCardReviewSessionActionsStore();
