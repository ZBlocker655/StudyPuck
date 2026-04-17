import { fail, redirect, type Actions, type ServerLoad } from '@sveltejs/kit';
import { getDb, withTransactionDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import {
  CardEntryRequestError,
  createCardEntryNoteForLanguage,
  deleteCardEntryNoteForLanguage,
  deferCardEntryNoteForLanguage,
  loadCardEntryInboxData,
  persistCardEntrySort,
  readCardEntrySort,
} from '$lib/server/card-entry.js';

export const load: ServerLoad = async (event) => {
  const { session } = await event.parent();
  const languageCode = event.params.lang;

  if (!languageCode) {
    throw redirect(303, '/');
  }

  const sort = readCardEntrySort(event.url, event.cookies, languageCode);

  persistCardEntrySort(event.cookies, languageCode, sort);

  if (!session?.user?.id) {
    return {
      inbox: {
        notes: [],
        sort,
        unprocessedNoteCount: 0,
      },
      loadError: 'You must be signed in to view Card Entry.',
    };
  }

  const database = getDb(env.DATABASE_URL);

  try {
    return {
      inbox: await loadCardEntryInboxData(session.user.id, languageCode, sort, database),
      loadError: null,
    };
  } catch (loadError) {
    console.error('Failed to load Card Entry inbox:', loadError);

    return {
      inbox: {
        notes: [],
        sort,
        unprocessedNoteCount: 0,
      },
      loadError: 'The Card Entry inbox could not be loaded right now.',
    };
  }
};

export const actions: Actions = {
  addNote: async (event) => {
    const session = await event.locals.auth();
    const languageCode = event.params.lang;

    if (!session?.user?.id || !languageCode) {
      throw redirect(303, '/');
    }

    const userId = session.user.id;

    const formData = await event.request.formData();
    const content = formData.get('content')?.toString() ?? '';
    const databaseUrl = env.DATABASE_URL;

    if (!databaseUrl) {
      return fail(500, {
        operation: 'add-note' as const,
        errorMessage: 'The note service is not configured right now.',
        submittedContent: content,
      });
    }

    try {
      await withTransactionDb(
        databaseUrl,
        (database) => createCardEntryNoteForLanguage(userId, languageCode, content, database as never)
      );

      return {
        operation: 'add-note' as const,
      };
    } catch (requestError) {
      if (requestError instanceof CardEntryRequestError) {
        return fail(requestError.status, {
          operation: 'add-note' as const,
          errorMessage: requestError.message,
          submittedContent: content,
        });
      }

      console.error('Failed to create Card Entry note from inbox form:', requestError);

      return fail(500, {
        operation: 'add-note' as const,
        errorMessage: 'The note could not be added right now.',
        submittedContent: content,
      });
    }
  },

  deferNote: async (event) => {
    const session = await event.locals.auth();
    const languageCode = event.params.lang;

    if (!session?.user?.id || !languageCode) {
      throw redirect(303, '/');
    }

    const userId = session.user.id;

    const formData = await event.request.formData();
    const noteId = formData.get('noteId')?.toString() ?? '';
    const databaseUrl = env.DATABASE_URL;

    if (!databaseUrl) {
      return fail(500, {
        operation: 'defer-note' as const,
        noteId,
        errorMessage: 'The note service is not configured right now.',
      });
    }

    try {
      await withTransactionDb(
        databaseUrl,
        (database) => deferCardEntryNoteForLanguage(userId, languageCode, noteId, database as never)
      );

      return {
        operation: 'defer-note' as const,
        noteId,
      };
    } catch (requestError) {
      if (requestError instanceof CardEntryRequestError) {
        return fail(requestError.status, {
          operation: 'defer-note' as const,
          noteId,
          errorMessage: requestError.message,
        });
      }

      console.error('Failed to defer Card Entry note:', requestError);

      return fail(500, {
        operation: 'defer-note' as const,
        noteId,
        errorMessage: 'The note could not be deferred right now.',
      });
    }
  },

  deleteNote: async (event) => {
    const session = await event.locals.auth();
    const languageCode = event.params.lang;

    if (!session?.user?.id || !languageCode) {
      throw redirect(303, '/');
    }

    const userId = session.user.id;

    const formData = await event.request.formData();
    const noteId = formData.get('noteId')?.toString() ?? '';
    const databaseUrl = env.DATABASE_URL;

    if (!databaseUrl) {
      return fail(500, {
        operation: 'delete-note' as const,
        noteId,
        errorMessage: 'The note service is not configured right now.',
      });
    }

    try {
      await withTransactionDb(
        databaseUrl,
        (database) => deleteCardEntryNoteForLanguage(userId, languageCode, noteId, database as never)
      );

      return {
        operation: 'delete-note' as const,
        noteId,
      };
    } catch (requestError) {
      if (requestError instanceof CardEntryRequestError) {
        return fail(requestError.status, {
          operation: 'delete-note' as const,
          noteId,
          errorMessage: requestError.message,
        });
      }

      console.error('Failed to delete Card Entry note:', requestError);

      return fail(500, {
        operation: 'delete-note' as const,
        noteId,
        errorMessage: 'The note could not be deleted right now.',
      });
    }
  },
};
