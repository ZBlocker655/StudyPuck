import type { ChatSurfaceContext } from '$lib/chat.js';
import { cardReviewSessionActions } from '$lib/stores/cardReviewSessionActions.js';

type ResolveCardReviewCommandResponseInput = {
  input: string;
  surfaceContext: ChatSurfaceContext | null;
};

function parseCardReviewCommand(input: string) {
  const trimmedInput = input.trim();

  if (!trimmedInput.startsWith('/')) {
    return null;
  }

  const [typedCommand] = trimmedInput.split(/\s+/, 1);

  if (typedCommand !== '/pin' && typedCommand !== '/snooze' && typedCommand !== '/next') {
    return null;
  }

  return typedCommand;
}

export async function resolveCardReviewCommandResponse(
  input: ResolveCardReviewCommandResponseInput,
): Promise<string | null> {
  const command = parseCardReviewCommand(input.input);

  if (!command) {
    return null;
  }

  if (input.surfaceContext?.surface !== 'card_review_session') {
    return 'Start a Card Review session before using that command.';
  }

  const { currentCardId } = input.surfaceContext;

  if (command === '/pin') {
    return cardReviewSessionActions.requestPin(currentCardId);
  }

  if (command === '/snooze') {
    return cardReviewSessionActions.requestSnooze(currentCardId);
  }

  return cardReviewSessionActions.requestNext(currentCardId);
}
