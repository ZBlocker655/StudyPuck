import { writable } from 'svelte/store';
import type {
  TranslationDrillContextCardData,
  TranslationDrillHomeData,
  TranslationDrillActionResult,
} from '$lib/server/translation-drills.js';

export type ActiveTranslationDrillChallenge = Extract<TranslationDrillActionResult, { action: 'challenge-start' }>['challenge'];

export type TranslationDrillSessionState = {
  lang: string | null;
  activeChallenge: ActiveTranslationDrillChallenge | null;
  generationInput: TranslationDrillHomeData['challenge']['generationInput'] | null;
  configuredGroups: Array<{ groupId: string; groupName: string }>;
  activeCards: TranslationDrillContextCardData[];
  focusedCardId: string | null;
};

const initialState: TranslationDrillSessionState = {
  lang: null,
  activeChallenge: null,
  generationInput: null,
  configuredGroups: [],
  activeCards: [],
  focusedCardId: null,
};

function createTranslationDrillSessionStore() {
  const { subscribe, update } = writable<TranslationDrillSessionState>(initialState);

  return {
    subscribe,
    sync(
      input: {
        lang: string | null;
        home: TranslationDrillHomeData | null;
        activeChallenge: ActiveTranslationDrillChallenge | null;
        focusedCardId: string | null;
      },
    ) {
      update((state) => ({
        ...state,
        lang: input.lang,
        activeChallenge: input.activeChallenge,
        generationInput: input.home?.challenge.generationInput ?? null,
        configuredGroups: input.home?.configuredGroups.map((group) => ({
          groupId: group.groupId,
          groupName: group.groupName,
        })) ?? [],
        activeCards: input.home?.challenge.generationInput.cards ?? [],
        focusedCardId: input.focusedCardId,
      }));
    },
    reset() {
      update(() => initialState);
    },
  };
}

export const translationDrillSession = createTranslationDrillSessionStore();
