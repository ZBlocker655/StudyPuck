import { redirect } from '@sveltejs/kit';
import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { loadActiveStudyLanguages, resolveAuthenticatedHomepage } from '$lib/server/homepage.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
  const { session } = await event.parent();

  if (session?.user?.id) {
    const database = getDb(env.DATABASE_URL);
    const activeLanguages = await loadActiveStudyLanguages(session.user.id, database);

    throw redirect(303, resolveAuthenticatedHomepage(activeLanguages));
  }

  return {};
};
