import { writable } from 'svelte/store';

export type TranslationDrillLocalResponse = {
  message: string;
  conversationReset?: boolean;
};

export type TranslationDrillSessionActionRequest =
  | {
      actionId: number;
      action: 'next';
      resolve: (response: TranslationDrillLocalResponse) => void;
      reject: (error: Error) => void;
    }
  | {
      actionId: number;
      action: 'draw';
      groupId: string;
      resolve: (response: TranslationDrillLocalResponse) => void;
      reject: (error: Error) => void;
    }
  | {
      actionId: number;
      action: 'snooze' | 'dismiss';
      cardId: string;
      resolve: (response: TranslationDrillLocalResponse) => void;
      reject: (error: Error) => void;
    };

type TranslationDrillSessionActionPayload =
  | {
      action: 'next';
    }
  | {
      action: 'draw';
      groupId: string;
    }
  | {
      action: 'snooze' | 'dismiss';
      cardId: string;
    };

function createTranslationDrillSessionActionsStore() {
  const { subscribe, set } = writable<TranslationDrillSessionActionRequest | null>(null);
  let actionCounter = 0;

  function dispatch(request: TranslationDrillSessionActionPayload) {
    actionCounter += 1;

    return new Promise<TranslationDrillLocalResponse>((resolve, reject) => {
      set({
        actionId: actionCounter,
        ...request,
        resolve,
        reject,
      } as TranslationDrillSessionActionRequest);
    });
  }

  return {
    subscribe,
    requestNext() {
      return dispatch({ action: 'next' });
    },
    requestDraw(groupId: string) {
      return dispatch({ action: 'draw', groupId });
    },
    requestSnooze(cardId: string) {
      return dispatch({ action: 'snooze', cardId });
    },
    requestDismiss(cardId: string) {
      return dispatch({ action: 'dismiss', cardId });
    },
  };
}

export const translationDrillSessionActions = createTranslationDrillSessionActionsStore();
