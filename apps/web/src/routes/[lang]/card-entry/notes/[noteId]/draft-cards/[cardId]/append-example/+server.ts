import { error, json, type RequestHandler } from '@sveltejs/kit';
import { withTransactionDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { z } from 'zod';
import { CardEntryRequestError, appendExampleSentenceToDraftCard } from '$lib/server/card-entry.js';

const appendExampleRequestSchema = z.object({
  text: z.string().trim().min(1, 'Example sentence text is required.').max(1_000, 'Example sentence must be 1,000 characters or fewer.'),
});

export const POST: RequestHandler = async (event) => {
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
    throw error(400, 'The request body must be valid JSON.');
  }

  const parsedBody = appendExampleRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    throw error(400, parsedBody.error.issues[0]?.message ?? 'The example sentence request is invalid.');
  }

  try {
    const result = await withTransactionDb(
      databaseUrl,
      (database) => appendExampleSentenceToDraftCard(userId, languageId, noteId, cardId, parsedBody.data.text, database as never)
    );

    return json(result);
  } catch (requestError) {
    if (requestError instanceof CardEntryRequestError) {
      throw error(requestError.status, requestError.message);
    }

    console.error('Failed to append example sentence to draft card:', requestError);
    throw error(500, 'The example sentence could not be saved right now.');
  }
};
