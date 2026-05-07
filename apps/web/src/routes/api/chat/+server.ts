import { error, json, type RequestHandler } from '@sveltejs/kit';
import { getDb, withTransactionDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { chatRequestSchema } from '$lib/chat.js';
import { resolveRouteContext } from '$lib/command-bar/shared.js';
import { CardEntryRequestError, createCardEntryNoteForLanguage } from '$lib/server/card-entry.js';
import { CardLibraryRequestError } from '$lib/server/cards.js';
import { handleStudyPuckChatRequest } from '$lib/server/chat.js';

export const POST: RequestHandler = async (event) => {
  const session = await event.locals.auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw error(401, 'You must be signed in to use StudyPuck chat.');
  }

  const parsedBody = chatRequestSchema.safeParse(await event.request.json().catch(() => null));

  if (!parsedBody.success) {
    throw error(400, parsedBody.error.issues[0]?.message ?? 'The chat request is invalid.');
  }

  const routeContext = resolveRouteContext(parsedBody.data.pathname);
  const database = env.DATABASE_URL ? getDb(env.DATABASE_URL) : null;

  try {
    const response = await handleStudyPuckChatRequest({
      userId,
      input: parsedBody.data.input,
      routeContext,
      languageId: parsedBody.data.languageId,
      noteId: parsedBody.data.noteId,
      cardId: parsedBody.data.cardId,
      focusedField: parsedBody.data.focusedField,
      surfaceContext: parsedBody.data.surfaceContext,
      conversationHistory: parsedBody.data.conversationHistory,
      database: database as never,
      privateEnv: env,
      createNote: async (payload) => {
        if (!env.DATABASE_URL) {
          throw new Error('The note service is not configured right now.');
        }

        await withTransactionDb(
          env.DATABASE_URL,
          (db) =>
            createCardEntryNoteForLanguage(userId, payload.languageId, payload.content, db as never),
        );
      },
    });

    return json(response);
  } catch (requestError) {
    if (requestError instanceof CardEntryRequestError || requestError instanceof CardLibraryRequestError) {
      throw error(requestError.status, requestError.message);
    }

    console.error('StudyPuck chat request failed:', requestError);
    throw error(500, 'The chat assistant could not respond right now.');
  }
};
