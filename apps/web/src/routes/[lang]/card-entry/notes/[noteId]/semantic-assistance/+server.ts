import { error, json, type RequestHandler } from '@sveltejs/kit';
import { withTransactionDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { refreshCardEntryNoteSemanticAssistance } from '$lib/server/card-entry-semantic.js';
import { CardEntryRequestError } from '$lib/server/card-entry.js';

export const POST: RequestHandler = async (event) => {
  const session = await event.locals.auth();
  const userId = session?.user?.id;
  const languageId = event.params.lang;
  const noteId = event.params.noteId;

  if (!userId || !languageId || !noteId) {
    throw error(401, 'You must be signed in to refresh semantic assistance.');
  }

  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw error(500, 'The semantic assistance service is not configured right now.');
  }

  try {
    const note = await withTransactionDb(databaseUrl, (database) =>
      refreshCardEntryNoteSemanticAssistance({
        userId,
        languageId,
        noteId,
        privateEnv: env,
        database,
      })
    );

    return json(note);
  } catch (requestError) {
    if (requestError instanceof CardEntryRequestError) {
      throw error(requestError.status, requestError.message);
    }

    console.error('Failed to refresh Card Entry semantic assistance:', requestError);
    throw error(500, 'Semantic assistance could not be refreshed right now.');
  }
};
