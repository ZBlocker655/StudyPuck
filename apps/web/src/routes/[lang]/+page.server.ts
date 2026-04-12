import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { loadDashboardStats } from '$lib/server/homepage.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
  const { session } = await event.parent();

  if (!session?.user?.id) {
    return {
      dashboard: {
        reviewDueCount: 0,
        inboxNoteCount: 0,
        streakDays: 0,
      },
    };
  }

  const database = getDb(env.DATABASE_URL);
  const dashboard = await loadDashboardStats(session.user.id, event.params.lang, database);

  return {
    dashboard,
  };
};
