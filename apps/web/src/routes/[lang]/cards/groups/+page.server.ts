import { error, redirect } from '@sveltejs/kit';
import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { CardLibraryRequestError, loadCardLibraryGroupsData } from '$lib/server/cards.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
  const { session } = await event.parent();
  const languageCode = event.params.lang;

  if (!session?.user?.id || !languageCode) {
    throw redirect(303, '/');
  }

  const database = getDb(env.DATABASE_URL);

  try {
    return {
      groups: await loadCardLibraryGroupsData(session.user.id, languageCode, database),
    };
  } catch (requestError) {
    if (requestError instanceof CardLibraryRequestError) {
      throw error(requestError.status, requestError.message);
    }

    throw requestError;
  }
};
