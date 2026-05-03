import { error, redirect } from '@sveltejs/kit';
import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { CardLibraryRequestError, loadGroupDetailData } from '$lib/server/cards.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
  const { session } = await event.parent();
  const languageCode = event.params.lang;
  const groupId = event.params.groupId;

  if (!session?.user?.id || !languageCode || !groupId) {
    throw redirect(303, '/');
  }

  const database = getDb(env.DATABASE_URL);

  try {
    return {
      groupDetail: await loadGroupDetailData(session.user.id, languageCode, groupId, event.url, database),
    };
  } catch (requestError) {
    if (requestError instanceof CardLibraryRequestError) {
      throw error(requestError.status, requestError.message);
    }

    throw requestError;
  }
};
