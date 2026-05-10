import { error, redirect } from '@sveltejs/kit';
import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { CardReviewRequestError, loadCardReviewSessionData } from '$lib/server/card-review.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
  const { session } = await event.parent();
  const languageCode = event.params.lang;

  if (!languageCode) {
    throw redirect(303, '/');
  }

  if (!session?.user?.id) {
    return {
      reviewSession: null,
      loadError: 'You must be signed in to start a Card Review session.',
    };
  }

  if (!env.DATABASE_URL) {
    return {
      reviewSession: null,
      loadError: 'Card Review is not configured right now.',
    };
  }

  const database = getDb(env.DATABASE_URL);

  try {
    return {
      reviewSession: await loadCardReviewSessionData(session.user.id, languageCode, event.url, database),
      loadError: null,
    };
  } catch (requestError) {
    if (requestError instanceof CardReviewRequestError) {
      throw error(requestError.status, requestError.message);
    }

    console.error('Failed to load Card Review session:', requestError);

    return {
      reviewSession: null,
      loadError: 'The Card Review session could not be loaded right now.',
    };
  }
};
