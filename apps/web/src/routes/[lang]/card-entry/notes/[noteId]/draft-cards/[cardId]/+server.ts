import { error, json, type RequestHandler } from '@sveltejs/kit';
import { withTransactionDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import {
  CardEntryRequestError,
  removeCardEntryDraftCardForLanguage,
  updateCardEntryDraftCardForLanguage,
} from '$lib/server/card-entry.js';

export const PATCH: RequestHandler = async (event) => {
  const session = await event.locals.auth();
  const userId = session?.user?.id;
  const params = event.params as {
    lang?: string;
    noteId?: string;
    cardId?: string;
  };
  const languageId = params.lang;
  const noteId = params.noteId;
  const cardId = params.cardId;

  if (!userId || !languageId || !noteId || !cardId) {
    throw error(401, 'You must be signed in to edit this draft card.');
  }

  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw error(500, 'The draft card service is not configured right now.');
  }

  let body: unknown;

  try {
    body = await event.request.json();
  } catch {
    throw error(400, 'The draft card update payload must be valid JSON.');
  }

  try {
    const result = await withTransactionDb(
      databaseUrl,
      (database) => updateCardEntryDraftCardForLanguage(userId, languageId, noteId, cardId, body, database as never)
    );

    return json(result);
  } catch (requestError) {
    if (requestError instanceof CardEntryRequestError) {
      throw error(requestError.status, requestError.message);
    }

    console.error('Failed to update Card Entry draft card:', requestError);
    throw error(500, 'The draft card could not be updated right now.');
  }
};

export const DELETE: RequestHandler = async (event) => {
  const session = await event.locals.auth();
  const userId = session?.user?.id;
  const params = event.params as {
    lang?: string;
    noteId?: string;
    cardId?: string;
  };
  const languageId = params.lang;
  const noteId = params.noteId;
  const cardId = params.cardId;

  if (!userId || !languageId || !noteId || !cardId) {
    throw error(401, 'You must be signed in to edit this draft card.');
  }

  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw error(500, 'The draft card service is not configured right now.');
  }

  try {
    const note = await withTransactionDb(
      databaseUrl,
      (database) => removeCardEntryDraftCardForLanguage(userId, languageId, noteId, cardId, database as never)
    );

    return json(note);
  } catch (requestError) {
    if (requestError instanceof CardEntryRequestError) {
      throw error(requestError.status, requestError.message);
    }

    console.error('Failed to remove Card Entry draft card:', requestError);
    throw error(500, 'The draft card could not be removed right now.');
  }
};
