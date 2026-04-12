import { fail, redirect } from '@sveltejs/kit';
import { addStudyLanguage, getDb, getActiveUserLanguages } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { getLanguageByCode } from '$lib/config/languages.js';
import type { Actions } from './$types.js';

export const actions: Actions = {
  addLanguage: async (event) => {
    const session = await event.locals.auth();

    if (!session?.user?.id) {
      throw redirect(303, '/');
    }

    const formData = await event.request.formData();
    const selectedLanguageCode = formData.get('languageId')?.toString();
    const selectedLanguage = getLanguageByCode(selectedLanguageCode);

    if (!selectedLanguage) {
      return fail(400, {
        addLanguageError: 'Choose a language before continuing.',
        selectedLanguageCode: selectedLanguageCode ?? '',
      });
    }

    const database = getDb(env.DATABASE_URL);
    const existingLanguages = await getActiveUserLanguages(session.user.id, database as never);

    if (existingLanguages.some((language) => language.languageId === selectedLanguage.code)) {
      return fail(400, {
        addLanguageError: `${selectedLanguage.label} is already part of your study setup.`,
        selectedLanguageCode: selectedLanguage.code,
      });
    }

    await addStudyLanguage(
      {
        userId: session.user.id,
        languageId: selectedLanguage.code,
        languageName: selectedLanguage.label,
      },
      database as never
    );

    throw redirect(303, `/${selectedLanguage.code}/`);
  },
};
