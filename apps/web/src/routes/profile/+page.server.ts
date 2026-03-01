import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { getDb, getUserByAuth0Id } from '@studypuck/database';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async (event) => {
  const session = await event.locals.auth();

  if (!session?.user?.id) {
    throw redirect(303, '/');
  }

  let dbProfile = null;
  try {
    const database = getDb(env.DATABASE_URL);
    dbProfile = await getUserByAuth0Id(session.user.id, database as any);
  } catch (err) {
    console.error('Failed to load user profile from database:', err);
  }

  return {
    session,
    dbProfile,
  };
};
