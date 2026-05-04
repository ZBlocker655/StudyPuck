import { json, type RequestHandler } from '@sveltejs/kit';
import { withTransactionDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import {
  CardLibraryRequestError,
  createCardLibraryGroupForLanguage,
  deleteCardLibraryGroupForLanguage,
} from '$lib/server/cards.js';

type GroupActionRequestBody =
  | {
      action?: 'create';
      groupName?: string;
      description?: string;
    }
  | {
      action?: 'delete';
      groupId?: string;
    };

export const POST: RequestHandler = async (event) => {
  const session = await event.locals.auth();
  const userId = session?.user?.id;
  const languageId = event.params.lang;

  if (!userId || !languageId) {
    return json({ message: 'You must be signed in to update groups.' }, { status: 401 });
  }

  if (!env.DATABASE_URL) {
    return json({ message: 'The group service is not configured right now.' }, { status: 500 });
  }

  let body: GroupActionRequestBody;

  try {
    body = (await event.request.json()) as GroupActionRequestBody;
  } catch {
    return json({ message: 'The group action payload must be valid JSON.' }, { status: 400 });
  }

  try {
    const result = await withTransactionDb(env.DATABASE_URL, async (database) => {
      if (body.action === 'create') {
        return {
          group: await createCardLibraryGroupForLanguage(
            userId,
            languageId,
            {
              groupName: body.groupName,
              description: body.description,
            },
            database as never,
          ),
        };
      }

      if (body.action === 'delete') {
        return {
          deleted: await deleteCardLibraryGroupForLanguage(userId, languageId, body.groupId, database as never),
        };
      }

      throw new CardLibraryRequestError(400, 'A valid group action is required.');
    });

    return json(result);
  } catch (requestError) {
    if (requestError instanceof CardLibraryRequestError) {
      return json({ message: requestError.message }, { status: requestError.status });
    }

    console.error('Failed to apply Card Library group action:', requestError);
    return json({ message: 'The group action could not be completed right now.' }, { status: 500 });
  }
};
