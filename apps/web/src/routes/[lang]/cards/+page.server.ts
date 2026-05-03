import { redirect } from '@sveltejs/kit';
import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { loadCardLibraryData } from '$lib/server/cards.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
  const { session } = await event.parent();
  const languageCode = event.params.lang;

  if (!session?.user?.id || !languageCode) {
    throw redirect(303, '/');
  }

  const database = getDb(env.DATABASE_URL);

  return {
    library: await loadCardLibraryData(session.user.id, languageCode, event.url, database),
  };
};
