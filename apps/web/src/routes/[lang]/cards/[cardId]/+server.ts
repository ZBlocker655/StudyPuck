import { error, json, type RequestHandler } from '@sveltejs/kit';
import { withTransactionDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import {
  CardLibraryRequestError,
  deleteCardLibraryCardsForLanguage,
  updateCardLibraryCardForLanguage,
} from '$lib/server/cards.js';

export const PATCH: RequestHandler = async (event) => {
  const session = await event.locals.auth();
  const userId = session?.user?.id;
  const params = event.params as {
    lang?: string;
    cardId?: string;
  };
  const languageId = params.lang;
  const cardId = params.cardId;

  if (!userId || !languageId || !cardId) {
    throw error(401, 'You must be signed in to edit this card.');
  }

  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw error(500, 'The card service is not configured right now.');
  }

  let body: unknown;

  try {
    body = await event.request.json();
  } catch {
    throw error(400, 'The card update payload must be valid JSON.');
  }

  try {
    const result = await withTransactionDb(
      databaseUrl,
      (database) => updateCardLibraryCardForLanguage(userId, languageId, cardId, body, database as never)
    );

    return json(result);
  } catch (requestError) {
    if (requestError instanceof CardLibraryRequestError) {
      throw error(requestError.status, requestError.message);
    }

    console.error('Failed to update active card:', requestError);
    throw error(500, 'The card could not be updated right now.');
  }
};

export const DELETE: RequestHandler = async (event) => {
  const session = await event.locals.auth();
  const userId = session?.user?.id;
  const params = event.params as {
    lang?: string;
    cardId?: string;
  };
  const languageId = params.lang;
  const cardId = params.cardId;

  if (!userId || !languageId || !cardId) {
    throw error(401, 'You must be signed in to edit this card.');
  }

  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw error(500, 'The card service is not configured right now.');
  }

  try {
    const deletedCardIds = await withTransactionDb(
      databaseUrl,
      (database) => deleteCardLibraryCardsForLanguage(userId, languageId, [cardId], database as never)
    );

    return json({
      deletedCardIds,
    });
  } catch (requestError) {
    if (requestError instanceof CardLibraryRequestError) {
      throw error(requestError.status, requestError.message);
    }

    console.error('Failed to delete active card:', requestError);
    throw error(500, 'The card could not be removed right now.');
  }
};
