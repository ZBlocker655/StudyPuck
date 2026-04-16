import { writable } from 'svelte/store';

export type CardEntryShellCountsState = Record<string, number>;

function clampCount(count: number) {
  return Math.max(0, count);
}

function createCardEntryShellCountsStore() {
  const store = writable<CardEntryShellCountsState>({});

  return {
    subscribe: store.subscribe,

    setCount(languageCode: string, count: number) {
      store.update((state) => ({
        ...state,
        [languageCode]: clampCount(count),
      }));
    },

    adjustCount(languageCode: string, delta: number) {
      store.update((state) => ({
        ...state,
        [languageCode]: clampCount((state[languageCode] ?? 0) + delta),
      }));
    },
  };
}

export const cardEntryShellCounts = createCardEntryShellCountsStore();
