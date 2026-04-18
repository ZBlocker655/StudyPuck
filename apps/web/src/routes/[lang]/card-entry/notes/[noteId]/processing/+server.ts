import { error, json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { ensureCardEntryNoteProcessingState } from '$lib/server/card-entry-ai.js';
import { CardEntryRequestError, loadCardEntryNoteShellData } from '$lib/server/card-entry.js';

export const GET: RequestHandler = async (event) => {
  const session = await event.locals.auth();
  const userId = session?.user?.id;
  const languageId = event.params.lang;
  const noteId = event.params.noteId;

  if (!userId || !languageId || !noteId) {
    throw error(401, 'You must be signed in to check this note.');
  }

  const database = getDb(env.DATABASE_URL);

  try {
    const workspace = await ensureCardEntryNoteProcessingState({
      userId,
      languageId,
      noteId,
      database,
      privateEnv: env,
    });

    if (!workspace) {
      throw error(404, 'Card Entry note not found.');
    }

    const note = await loadCardEntryNoteShellData(userId, languageId, noteId, database);

    return json(note);
  } catch (requestError) {
    if (requestError instanceof CardEntryRequestError) {
      throw error(requestError.status, requestError.message);
    }

    console.error('Failed to update Card Entry note processing state:', requestError);
    throw error(500, 'The note processing status could not be refreshed right now.');
  }
};
