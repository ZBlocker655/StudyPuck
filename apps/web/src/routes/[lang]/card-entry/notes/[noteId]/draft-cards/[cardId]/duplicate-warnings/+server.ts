import { error, json, type RequestHandler } from '@sveltejs/kit';
import { withTransactionDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { dismissCardEntryDuplicateWarning } from '$lib/server/card-entry-semantic.js';
import { CardEntryRequestError } from '$lib/server/card-entry.js';

export const POST: RequestHandler = async (event) => {
  const session = await event.locals.auth();
  const userId = session?.user?.id;
  const languageId = event.params.lang;
  const noteId = event.params.noteId;
  const cardId = event.params.cardId;

  if (!userId || !languageId || !noteId || !cardId) {
    throw error(401, 'You must be signed in to update duplicate warnings.');
  }

  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    throw error(500, 'The duplicate warning service is not configured right now.');
  }

  let body: unknown;

  try {
    body = await event.request.json();
  } catch {
    throw error(400, 'The duplicate warning request must be valid JSON.');
  }

  const warningId =
    typeof (body as { warningId?: unknown } | null | undefined)?.warningId === 'string'
      ? (body as { warningId: string }).warningId.trim()
      : '';

  if (!warningId) {
    throw error(400, 'A duplicate warning identifier is required.');
  }

  try {
    const note = await withTransactionDb(databaseUrl, (database) =>
      dismissCardEntryDuplicateWarning({
        userId,
        languageId,
        noteId,
        cardId,
        warningId,
        privateEnv: env,
        database,
      })
    );

    return json(note);
  } catch (requestError) {
    if (requestError instanceof CardEntryRequestError) {
      throw error(requestError.status, requestError.message);
    }

    console.error('Failed to dismiss Card Entry duplicate warning:', requestError);
    throw error(500, 'The duplicate warning could not be updated right now.');
  }
};
