import { error, json, type RequestHandler } from '@sveltejs/kit';
import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { createCardEntryNoteSchema } from '$lib/schemas/card-entry.js';
import { CardEntryRequestError, createCardEntryNoteForLanguage } from '$lib/server/card-entry.js';

export const POST: RequestHandler = async (event) => {
  const session = await event.locals.auth();

  if (!session?.user?.id) {
    throw error(401, 'You must be signed in to add notes.');
  }

  const parsedBody = createCardEntryNoteSchema.safeParse(await event.request.json().catch(() => null));

  if (!parsedBody.success) {
    throw error(400, parsedBody.error.issues[0]?.message ?? 'The note request is invalid.');
  }

  const database = getDb(env.DATABASE_URL);

  try {
    const note = await createCardEntryNoteForLanguage(
      session.user.id,
      parsedBody.data.languageId,
      parsedBody.data.content,
      database
    );

    return json({
      noteId: note.noteId,
    });
  } catch (requestError) {
    if (requestError instanceof CardEntryRequestError) {
      throw error(requestError.status, requestError.message);
    }

    console.error('Failed to create Card Entry note via API:', requestError);
    throw error(500, 'The note could not be added right now.');
  }
};
