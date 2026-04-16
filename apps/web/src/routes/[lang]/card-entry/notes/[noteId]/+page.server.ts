import { error, type ServerLoad } from '@sveltejs/kit';
import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { CardEntryRequestError, loadCardEntryNoteShellData } from '$lib/server/card-entry.js';

export const load: ServerLoad = async (event) => {
  const { session } = await event.parent();
  const languageCode = event.params.lang;
  const noteId = event.params.noteId;

  if (!session?.user?.id || !languageCode || !noteId) {
    throw error(401, 'You must be signed in to view this note.');
  }

  const database = getDb(env.DATABASE_URL);

  try {
    return {
      note: await loadCardEntryNoteShellData(
        session.user.id,
        languageCode,
        noteId,
        database
      ),
    };
  } catch (requestError) {
    if (requestError instanceof CardEntryRequestError) {
      throw error(requestError.status, requestError.message);
    }

    console.error('Failed to load Card Entry note shell:', requestError);
    throw error(500, 'The note could not be loaded right now.');
  }
};
