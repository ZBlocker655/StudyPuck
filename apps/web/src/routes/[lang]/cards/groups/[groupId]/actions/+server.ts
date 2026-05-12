import { json, type RequestHandler } from '@sveltejs/kit';
import { withTransactionDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import {
  addCardsToGroupDetailForLanguage,
  CardLibraryRequestError,
  deleteCardLibraryGroupForLanguage,
  removeCardsFromGroupDetailForLanguage,
  updateGroupDetailForLanguage,
  updateGroupTranslationDrillsForLanguage,
} from '$lib/server/cards.js';

type GroupDetailActionRequestBody =
  | {
      action?: 'update-group';
      groupName?: string;
      description?: string | null;
    }
  | {
      action?: 'add-cards' | 'remove-cards';
      cardIds?: string[];
    }
  | {
      action?: 'delete-group';
    }
  | {
      action?: 'update-translation-drills';
      enabled?: boolean;
      drawPileName?: string | null;
      pileSizeLimit?: number | string;
    };

export const POST: RequestHandler = async (event) => {
  const session = await event.locals.auth();
  const userId = session?.user?.id;
  const languageId = event.params.lang;
  const groupId = event.params.groupId;

  if (!userId || !languageId || !groupId) {
    return json({ message: 'You must be signed in to update this group.' }, { status: 401 });
  }

  if (!env.DATABASE_URL) {
    return json({ message: 'The group service is not configured right now.' }, { status: 500 });
  }

  let body: GroupDetailActionRequestBody;

  try {
    body = (await event.request.json()) as GroupDetailActionRequestBody;
  } catch {
    return json({ message: 'The group action payload must be valid JSON.' }, { status: 400 });
  }

  try {
    const result = await withTransactionDb(env.DATABASE_URL, async (database) => {
      if (body.action === 'update-group') {
        return {
          group: await updateGroupDetailForLanguage(
            userId,
            languageId,
            groupId,
            {
              groupName: body.groupName,
              description: body.description,
            },
            database as never,
          ),
        };
      }

      if (body.action === 'add-cards') {
        return {
          addedCardIds: await addCardsToGroupDetailForLanguage(
            userId,
            languageId,
            groupId,
            body.cardIds,
            database as never,
          ),
        };
      }

      if (body.action === 'remove-cards') {
        return {
          removedCardIds: await removeCardsFromGroupDetailForLanguage(
            userId,
            languageId,
            groupId,
            body.cardIds,
            database as never,
          ),
        };
      }

      if (body.action === 'delete-group') {
        return {
          deleted: await deleteCardLibraryGroupForLanguage(userId, languageId, groupId, database as never),
        };
      }

      if (body.action === 'update-translation-drills') {
        return {
          translationDrills: await updateGroupTranslationDrillsForLanguage(
            userId,
            languageId,
            groupId,
            {
              enabled: body.enabled,
              drawPileName: body.drawPileName,
              pileSizeLimit: body.pileSizeLimit,
            },
            database as never,
          ),
        };
      }

      throw new CardLibraryRequestError(400, 'A valid group action is required.');
    });

    return json(result);
  } catch (requestError) {
    if (requestError instanceof CardLibraryRequestError) {
      return json({ message: requestError.message }, { status: requestError.status });
    }

    console.error('Failed to apply Group Detail action:', requestError);
    return json({ message: 'The group action could not be completed right now.' }, { status: 500 });
  }
};
