import { json, type RequestHandler } from '@sveltejs/kit';
import { withTransactionDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import {
  CardEntryRequestError,
  deleteCardEntryDraftsForLanguage,
  promoteCardEntryDraftsForLanguage,
} from '$lib/server/card-entry.js';

type DraftActionRequestBody = {
  action?: 'promote' | 'delete';
  cardIds?: string[];
};

export const POST: RequestHandler = async (event) => {
  const session = await event.locals.auth();
  const userId = session?.user?.id;
  const languageId = event.params.lang;

  if (!userId || !languageId) {
    return json({ message: 'You must be signed in to update draft cards.' }, { status: 401 });
  }

  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    return json({ message: 'The draft card service is not configured right now.' }, { status: 500 });
  }

  let body: DraftActionRequestBody;

  try {
    body = (await event.request.json()) as DraftActionRequestBody;
  } catch {
    return json({ message: 'The draft action payload must be valid JSON.' }, { status: 400 });
  }

  try {
    const result = await withTransactionDb(databaseUrl, async (database) => {
      if (body.action === 'promote') {
        return promoteCardEntryDraftsForLanguage(userId, languageId, body.cardIds, database as never);
      }

      if (body.action === 'delete') {
        return deleteCardEntryDraftsForLanguage(userId, languageId, body.cardIds, database as never);
      }

      throw new CardEntryRequestError(400, 'A valid draft action is required.');
    });

    return json(result);
  } catch (requestError) {
    if (requestError instanceof CardEntryRequestError) {
      return json({ message: requestError.message }, { status: requestError.status });
    }

    console.error('Failed to apply Card Entry draft action:', requestError);
    return json({ message: 'The draft action could not be completed right now.' }, { status: 500 });
  }
};
