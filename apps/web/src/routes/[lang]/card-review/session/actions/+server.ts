import { json, type RequestHandler } from '@sveltejs/kit';
import { withTransactionDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { applyCardReviewSessionAction, CardReviewRequestError } from '$lib/server/card-review.js';

export const POST: RequestHandler = async (event) => {
  const session = await event.locals.auth();
  const userId = session?.user?.id;
  const languageId = event.params.lang;

  if (!userId || !languageId) {
    return json({ message: 'You must be signed in to review cards.' }, { status: 401 });
  }

  if (!env.DATABASE_URL) {
    return json({ message: 'Card Review is not configured right now.' }, { status: 500 });
  }

  let body: unknown;

  try {
    body = await event.request.json();
  } catch {
    return json({ message: 'The Card Review action payload must be valid JSON.' }, { status: 400 });
  }

  try {
    const result = await withTransactionDb(
      env.DATABASE_URL,
      (database) => applyCardReviewSessionAction(userId, languageId, body, database as never),
    );

    return json(result);
  } catch (requestError) {
    if (requestError instanceof CardReviewRequestError) {
      return json({ message: requestError.message }, { status: requestError.status });
    }

    console.error('Failed to apply Card Review action:', requestError);
    return json({ message: 'The review action could not be completed right now.' }, { status: 500 });
  }
};
