import { error, json, type RequestHandler } from '@sveltejs/kit';
import { withTransactionDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { CardEntryRequestError, createCardEntryDraftCardForLanguage } from '$lib/server/card-entry.js';

export const POST: RequestHandler = async (event) => {
  const session = await event.locals.auth();
  const userId = session?.user?.id;
  const languageId = event.params.lang;
  const noteId = event.params.noteId;

  if (!userId || !languageId || !noteId) {
    throw error(401, 'You must be signed in to edit this note.');
  }

  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw error(500, 'The draft card service is not configured right now.');
  }

  try {
    const note = await withTransactionDb(
      databaseUrl,
      (database) => createCardEntryDraftCardForLanguage(userId, languageId, noteId, database as never)
    );

    return json(note);
  } catch (requestError) {
    if (requestError instanceof CardEntryRequestError) {
      throw error(requestError.status, requestError.message);
    }

    console.error('Failed to create Card Entry draft card:', requestError);
    throw error(500, 'The draft card could not be created right now.');
  }
};
