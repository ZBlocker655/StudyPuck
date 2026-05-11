import { error, redirect } from '@sveltejs/kit';
import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { loadTranslationDrillHomeData, TranslationDrillRequestError } from '$lib/server/translation-drills.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
  const { session } = await event.parent();
  const languageCode = event.params.lang;

  if (!languageCode) {
    throw redirect(303, '/');
  }

  if (!session?.user?.id) {
    return {
      home: null,
      loadError: 'You must be signed in to view Translation Drills.',
    };
  }

  if (!env.DATABASE_URL) {
    return {
      home: null,
      loadError: 'Translation Drills is not configured right now.',
    };
  }

  const database = getDb(env.DATABASE_URL);

  try {
    return {
      home: await loadTranslationDrillHomeData(session.user.id, languageCode, database),
      loadError: null,
    };
  } catch (requestError) {
    if (requestError instanceof TranslationDrillRequestError) {
      throw error(requestError.status, requestError.message);
    }

    console.error('Failed to load Translation Drills home:', requestError);

    return {
      home: null,
      loadError: 'The Translation Drills home could not be loaded right now.',
    };
  }
};
