import { writable } from 'svelte/store';

export type QuickAddRequest = {
  languageCode?: string | null;
  initialContent?: string;
};

export type CardEntryUiState = {
  quickAddOpen: boolean;
  requestId: number;
  languageCode: string | null;
  initialContent: string;
};

function createCardEntryUiStore() {
  const initialState: CardEntryUiState = {
    quickAddOpen: false,
    requestId: 0,
    languageCode: null,
    initialContent: '',
  };
  const store = writable<CardEntryUiState>(initialState);

  return {
    subscribe: store.subscribe,

    openQuickAdd(request: QuickAddRequest = {}) {
      store.update((state) => ({
        quickAddOpen: true,
        requestId: state.requestId + 1,
        languageCode: request.languageCode ?? null,
        initialContent: request.initialContent ?? '',
      }));
    },

    closeQuickAdd() {
      store.update((state) => ({
        ...state,
        quickAddOpen: false,
        languageCode: null,
        initialContent: '',
      }));
    },
  };
}

export const cardEntryUi = createCardEntryUiStore();
