import { error, redirect } from '@sveltejs/kit';
import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { CardReviewRequestError, loadCardReviewHomeData } from '$lib/server/card-review.js';
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
      loadError: 'You must be signed in to view Card Review.',
    };
  }

  if (!env.DATABASE_URL) {
    return {
      home: null,
      loadError: 'Card Review is not configured right now.',
    };
  }

  const database = getDb(env.DATABASE_URL);

  try {
    return {
      home: await loadCardReviewHomeData(session.user.id, languageCode, event.url, database),
      loadError: null,
    };
  } catch (requestError) {
    if (requestError instanceof CardReviewRequestError) {
      throw error(requestError.status, requestError.message);
    }

    console.error('Failed to load Card Review home:', requestError);

    return {
      home: null,
      loadError: 'The Card Review home could not be loaded right now.',
    };
  }
};
