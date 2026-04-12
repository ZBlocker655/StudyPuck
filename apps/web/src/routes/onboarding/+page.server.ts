import { fail, redirect } from '@sveltejs/kit';
import { addStudyLanguage, getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { getLanguageByCode, SUPPORTED_LANGUAGES } from '$lib/config/languages.js';
import { loadActiveStudyLanguages, resolveAuthenticatedHomepage } from '$lib/server/homepage.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
  const { session } = await event.parent();

  if (!session?.user?.id) {
    throw redirect(303, '/');
  }

  const database = getDb(env.DATABASE_URL);
  const activeLanguages = await loadActiveStudyLanguages(session.user.id, database);

  if (activeLanguages.length > 0) {
    throw redirect(303, resolveAuthenticatedHomepage(activeLanguages));
  }

  return {
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
};

export const actions: Actions = {
  default: async (event) => {
    const session = await event.locals.auth();

    if (!session?.user?.id) {
      throw redirect(303, '/');
    }

    const formData = await event.request.formData();
    const selectedLanguages = Array.from(
      new Set(
        formData
          .getAll('languages')
          .map((value) => value.toString())
          .filter((value) => getLanguageByCode(value))
      )
    );

    if (selectedLanguages.length === 0) {
      return fail(400, {
        error: 'Select at least one language to continue.',
        selectedLanguages,
      });
    }

    const database = getDb(env.DATABASE_URL);
    const activeLanguages = await loadActiveStudyLanguages(session.user.id, database);

    if (activeLanguages.length > 0) {
      throw redirect(303, resolveAuthenticatedHomepage(activeLanguages));
    }

    for (const languageCode of selectedLanguages) {
      const language = getLanguageByCode(languageCode);

      if (!language) {
        continue;
      }

      await addStudyLanguage(
        {
          userId: session.user.id,
          languageId: language.code,
          languageName: language.label,
        },
        database as never
      );
    }

    throw redirect(303, `/${selectedLanguages[0]}/`);
  },
};
