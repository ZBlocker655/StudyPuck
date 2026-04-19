import { redirect, type ServerLoad } from '@sveltejs/kit';
import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { loadStatisticsData } from '$lib/server/statistics.js';

export const load: ServerLoad = async (event) => {
  const { session } = await event.parent();
  const languageCode = event.params.lang;

  if (!session?.user?.id || !languageCode) {
    throw redirect(303, '/');
  }

  const database = getDb(env.DATABASE_URL);

  return {
    statistics: await loadStatisticsData(session.user.id, languageCode, database),
  };
};
