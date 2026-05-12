import { get } from 'svelte/store';
import { translationDrillSession } from '$lib/stores/translationDrillSession.js';
import {
  translationDrillSessionActions,
  type TranslationDrillLocalResponse,
} from '$lib/stores/translationDrillSessionActions.js';

function parseTranslationDrillCommand(input: string) {
  const trimmedInput = input.trim();

  if (!trimmedInput.startsWith('/')) {
    return null;
  }

  const [typedCommand, ...rest] = trimmedInput.split(/\s+/);

  if (!typedCommand) {
    return null;
  }

  return {
    command: typedCommand,
    argument: rest.join(' ').trim(),
  };
}

function formatContextSummary() {
  const state = get(translationDrillSession);

  if (state.activeCards.length === 0) {
    return 'There are no active Translation Drills cards yet.';
  }

  return `Active context: ${state.activeCards.map((card) => card.content).join(', ')}.`;
}

function resolveTargetCardId() {
  const state = get(translationDrillSession);

  return state.focusedCardId ?? state.activeCards[0]?.cardId ?? null;
}

function resolveGroupId(argument: string) {
  const state = get(translationDrillSession);

  if (state.configuredGroups.length === 0) {
    return {
      groupId: null,
      message: 'Configure at least one draw pile before using /draw.',
    };
  }

  if (!argument) {
    if (state.configuredGroups.length === 1) {
      return {
        groupId: state.configuredGroups[0]?.groupId ?? null,
        message: null,
      };
    }

    return {
      groupId: null,
      message: `Specify which pile to draw from: ${state.configuredGroups.map((group) => group.groupName).join(', ')}.`,
    };
  }

  const normalizedArgument = argument.trim().toLocaleLowerCase();
  const matchingGroup = state.configuredGroups.find((group) =>
    group.groupName.toLocaleLowerCase() === normalizedArgument
    || group.groupName.toLocaleLowerCase().startsWith(normalizedArgument),
  );

  if (!matchingGroup) {
    return {
      groupId: null,
      message: `No Translation Drills pile matched "${argument}".`,
    };
  }

  return {
    groupId: matchingGroup.groupId,
    message: null,
  };
}

export async function resolveTranslationDrillCommandResponse(input: string): Promise<TranslationDrillLocalResponse | string | null> {
  const parsed = parseTranslationDrillCommand(input);

  if (!parsed) {
    return null;
  }

  if (parsed.command === '/context') {
    return formatContextSummary();
  }

  if (parsed.command === '/next') {
    const state = get(translationDrillSession);

    if (!state.generationInput || state.generationInput.activeCardCount === 0) {
      return 'Draw or pin at least one active card before starting a challenge.';
    }

    return translationDrillSessionActions.requestNext();
  }

  if (parsed.command === '/draw') {
    const group = resolveGroupId(parsed.argument);

    if (!group.groupId) {
      return group.message;
    }

    return translationDrillSessionActions.requestDraw(group.groupId);
  }

  if (parsed.command === '/snooze') {
    const cardId = resolveTargetCardId();

    if (!cardId) {
      return 'Focus a Translation Drills card before using /snooze.';
    }

    return translationDrillSessionActions.requestSnooze(cardId);
  }

  if (parsed.command === '/dismiss') {
    const cardId = resolveTargetCardId();

    if (!cardId) {
      return 'Focus a Translation Drills card before using /dismiss.';
    }

    return translationDrillSessionActions.requestDismiss(cardId);
  }

  return null;
}
