import { json, type RequestHandler } from '@sveltejs/kit';
import { withTransactionDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { applyTranslationDrillAction, TranslationDrillRequestError } from '$lib/server/translation-drills.js';

export const POST: RequestHandler = async (event) => {
  const session = await event.locals.auth();
  const userId = session?.user?.id;
  const languageId = event.params.lang;

  if (!userId || !languageId) {
    return json({ message: 'You must be signed in to use Translation Drills.' }, { status: 401 });
  }

  if (!env.DATABASE_URL) {
    return json({ message: 'Translation Drills is not configured right now.' }, { status: 500 });
  }

  let body: unknown;

  try {
    body = await event.request.json();
  } catch {
    return json({ message: 'The Translation Drills action payload must be valid JSON.' }, { status: 400 });
  }

  try {
    const result = await withTransactionDb(
      env.DATABASE_URL,
      (database) => applyTranslationDrillAction(userId, languageId, body, database as never, undefined, {
        privateEnv: env,
      }),
    );

    return json(result);
  } catch (requestError) {
    if (requestError instanceof TranslationDrillRequestError) {
      return json({ message: requestError.message }, { status: requestError.status });
    }

    console.error('Failed to apply Translation Drills action:', requestError);
    return json({ message: 'The Translation Drills action could not be completed right now.' }, { status: 500 });
  }
};
