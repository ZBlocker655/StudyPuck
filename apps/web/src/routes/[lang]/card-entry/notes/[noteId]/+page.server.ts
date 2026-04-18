import { error, fail, redirect, type Actions, type ServerLoad } from '@sveltejs/kit';
import { getDb, withTransactionDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import {
  CardEntryRequestError,
  deferCardEntryNoteForLanguage,
  deleteCardEntryNoteForLanguage,
  loadCardEntryNoteShellData,
  signOffCardEntryNoteForLanguage,
} from '$lib/server/card-entry.js';

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

export const actions: Actions = {
  deferNote: async (event) => {
    const session = await event.locals.auth();
    const languageCode = event.params.lang;
    const noteId = event.params.noteId;
    const userId = session?.user?.id;

    if (!userId || !languageCode || !noteId) {
      throw redirect(303, '/');
    }

    const databaseUrl = env.DATABASE_URL;

    if (!databaseUrl) {
      return fail(500, {
        operation: 'defer-note' as const,
        errorMessage: 'The note service is not configured right now.',
      });
    }

    try {
      await withTransactionDb(
        databaseUrl,
        (database) => deferCardEntryNoteForLanguage(userId, languageCode, noteId, database as never)
      );
    } catch (requestError) {
      if (requestError instanceof CardEntryRequestError) {
        return fail(requestError.status, {
          operation: 'defer-note' as const,
          errorMessage: requestError.message,
        });
      }

      console.error('Failed to defer Card Entry note from workspace:', requestError);

      return fail(500, {
        operation: 'defer-note' as const,
        errorMessage: 'The note could not be deferred right now.',
      });
    }

    throw redirect(303, `/${languageCode}/card-entry`);
  },

  deleteNote: async (event) => {
    const session = await event.locals.auth();
    const languageCode = event.params.lang;
    const noteId = event.params.noteId;
    const userId = session?.user?.id;

    if (!userId || !languageCode || !noteId) {
      throw redirect(303, '/');
    }

    const databaseUrl = env.DATABASE_URL;

    if (!databaseUrl) {
      return fail(500, {
        operation: 'delete-note' as const,
        errorMessage: 'The note service is not configured right now.',
      });
    }

    try {
      await withTransactionDb(
        databaseUrl,
        (database) => deleteCardEntryNoteForLanguage(userId, languageCode, noteId, database as never)
      );
    } catch (requestError) {
      if (requestError instanceof CardEntryRequestError) {
        return fail(requestError.status, {
          operation: 'delete-note' as const,
          errorMessage: requestError.message,
        });
      }

      console.error('Failed to delete Card Entry note from workspace:', requestError);

      return fail(500, {
        operation: 'delete-note' as const,
        errorMessage: 'The note could not be deleted right now.',
      });
    }

    throw redirect(303, `/${languageCode}/card-entry`);
  },

  signOffNote: async (event) => {
    const session = await event.locals.auth();
    const languageCode = event.params.lang;
    const noteId = event.params.noteId;
    const userId = session?.user?.id;

    if (!userId || !languageCode || !noteId) {
      throw redirect(303, '/');
    }

    const databaseUrl = env.DATABASE_URL;

    if (!databaseUrl) {
      return fail(500, {
        operation: 'sign-off-note' as const,
        errorMessage: 'The note service is not configured right now.',
      });
    }

    try {
      await withTransactionDb(
        databaseUrl,
        (database) => signOffCardEntryNoteForLanguage(userId, languageCode, noteId, database as never)
      );
    } catch (requestError) {
      if (requestError instanceof CardEntryRequestError) {
        return fail(requestError.status, {
          operation: 'sign-off-note' as const,
          errorMessage: requestError.message,
        });
      }

      console.error('Failed to sign off Card Entry note:', requestError);

      return fail(500, {
        operation: 'sign-off-note' as const,
        errorMessage: 'The note could not be signed off right now.',
      });
    }

    throw redirect(303, `/${languageCode}/card-entry`);
  },
};
