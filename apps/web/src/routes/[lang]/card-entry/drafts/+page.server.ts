import { redirect, type ServerLoad } from '@sveltejs/kit';
import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { loadCardEntryDraftsData } from '$lib/server/card-entry.js';

export const load: ServerLoad = async (event) => {
  const { session } = await event.parent();
  const languageCode = event.params.lang;

  if (!languageCode) {
    throw redirect(303, '/');
  }

  if (!session?.user?.id) {
    throw redirect(303, '/');
  }

  const database = getDb(env.DATABASE_URL);

  try {
    return {
      drafts: await loadCardEntryDraftsData(session.user.id, languageCode, database),
      loadError: null,
    };
  } catch (loadError) {
    console.error('Failed to load Card Entry drafts:', loadError);

    return {
      drafts: {
        items: [],
        availableGroups: [],
        draftCardCount: 0,
      },
      loadError: 'The Drafts view could not be loaded right now.',
    };
  }
};
