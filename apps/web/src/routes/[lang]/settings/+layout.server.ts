import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { loadSettingsData } from '$lib/server/settings.js';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async (event) => {
  const { session } = await event.parent();

  if (!session?.user?.id) {
    return {
      dbProfile: null,
      languageSummaries: [],
    };
  }

  try {
    const database = getDb(env.DATABASE_URL);
    return await loadSettingsData(session.user.id, event.params.lang, database as never);
  } catch (error) {
    console.error('Failed to load settings data from database:', error);

    return {
      dbProfile: null,
      languageSummaries: [],
    };
  }
};
