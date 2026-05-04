import { json, type RequestHandler } from '@sveltejs/kit';
import { withTransactionDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import {
  bulkAssignCardLibraryCardsToGroupForLanguage,
  CardLibraryRequestError,
  deleteCardLibraryCardsForLanguage,
} from '$lib/server/cards.js';

type CardLibraryActionRequestBody = {
  action?: 'assign-group' | 'delete';
  cardIds?: string[];
  groupId?: string;
};

export const POST: RequestHandler = async (event) => {
  const session = await event.locals.auth();
  const userId = session?.user?.id;
  const languageId = event.params.lang;

  if (!userId || !languageId) {
    return json({ message: 'You must be signed in to update cards.' }, { status: 401 });
  }

  if (!env.DATABASE_URL) {
    return json({ message: 'The card service is not configured right now.' }, { status: 500 });
  }

  let body: CardLibraryActionRequestBody;

  try {
    body = (await event.request.json()) as CardLibraryActionRequestBody;
  } catch {
    return json({ message: 'The card action payload must be valid JSON.' }, { status: 400 });
  }

  try {
    const result = await withTransactionDb(env.DATABASE_URL, async (database) => {
      if (body.action === 'delete') {
        return {
          deletedCardIds: await deleteCardLibraryCardsForLanguage(userId, languageId, body.cardIds, database as never),
        };
      }

      if (body.action === 'assign-group') {
        return {
          assignedCardIds: await bulkAssignCardLibraryCardsToGroupForLanguage(
            userId,
            languageId,
            body.cardIds,
            body.groupId,
            database as never,
          ),
        };
      }

      throw new CardLibraryRequestError(400, 'A valid card action is required.');
    });

    return json(result);
  } catch (requestError) {
    if (requestError instanceof CardLibraryRequestError) {
      return json({ message: requestError.message }, { status: requestError.status });
    }

    console.error('Failed to apply Card Library action:', requestError);
    return json({ message: 'The card action could not be completed right now.' }, { status: 500 });
  }
};
